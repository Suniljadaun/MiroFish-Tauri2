"""
LLM客户端封装
统一使用OpenAI格式调用
"""

import json
import logging
import re
import time
from typing import Optional, Dict, Any, List
from openai import OpenAI

from ..config import Config

logger = logging.getLogger(__name__)

# Maximum retries for rate-limit errors
_MAX_RETRIES = 20
_DEFAULT_RETRY_WAIT = 15  # Default wait if we can't parse the retry delay
_MIN_RETRY_WAIT = 10
_MAX_RETRY_WAIT = 120  # Cap at 2 minutes (Gemini resets per-minute)

# Proactive throttle: minimum seconds between consecutive LLM calls.
# Gemini free tier allows ~15 RPM → 1 call per 4s is safe.
# Set to 5s to give a comfortable buffer.
_THROTTLE_DELAY = 5.0
_last_call_time: float = 0.0


def _parse_retry_delay(error_str: str) -> Optional[int]:
    """
    Parse the suggested retry delay from an API error message.
    
    Supports formats like:
      - "Please try again in 1h20m35.808s"
      - "Please try again in 11m53.664s"
      - "Please try again in 49.491962596s"
      - "Please retry in 55s"
      - "retryDelay": "55s"
    
    Returns seconds to wait, or None if not parseable.
    """
    # Try pattern: Xh Ym Zs (with optional decimals)
    patterns = [
        r'(?:try|retry)\s+(?:again\s+)?in\s+(?:(\d+)h)?(\d+)m([\d.]+)s',
        r'(?:try|retry)\s+(?:again\s+)?in\s+(?:(\d+)h)?([\d.]+)s',
        r'retryDelay["\s:]+(?:(\d+)h)?(?:(\d+)m)?([\d.]+)s',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, error_str, re.IGNORECASE)
        if match:
            groups = match.groups()
            total = 0
            if len(groups) == 3:
                # hours, minutes, seconds
                hours = int(groups[0]) if groups[0] else 0
                minutes = int(groups[1]) if groups[1] else 0
                seconds = float(groups[2]) if groups[2] else 0
                total = hours * 3600 + minutes * 60 + seconds
            elif len(groups) == 2:
                # hours (optional), seconds
                hours = int(groups[0]) if groups[0] else 0
                seconds = float(groups[1]) if groups[1] else 0
                total = hours * 3600 + seconds
            
            if total > 0:
                return min(int(total) + 5, _MAX_RETRY_WAIT)  # Add 5s buffer
    
    return None


class LLMClient:
    """LLM客户端"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.api_key = api_key or Config.LLM_API_KEY
        self.base_url = base_url or Config.LLM_BASE_URL
        self.model = model or Config.LLM_MODEL_NAME
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY 未配置")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: Optional[Dict] = None
    ) -> str:
        """
        发送聊天请求（带自动速率限制重试）
        
        Rate limit errors are retried automatically. If the API response
        includes a suggested retry delay (e.g. "try again in 1h20m"), the
        client will wait exactly that long before retrying. This enables
        free-tier APIs (Groq, Gemini, etc.) to complete long tasks even
        with strict daily token quotas.
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            response_format: 响应格式（如JSON模式）
            
        Returns:
            模型响应文本
        """
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if response_format:
            kwargs["response_format"] = response_format
        
        # Proactive throttle: enforce minimum gap between calls to avoid
        # bursting through the free-tier RPM limit (Gemini: ~15 RPM).
        global _last_call_time
        elapsed = time.time() - _last_call_time
        if elapsed < _THROTTLE_DELAY:
            sleep_for = _THROTTLE_DELAY - elapsed
            logger.debug(f"Throttling: waiting {sleep_for:.1f}s before next LLM call")
            time.sleep(sleep_for)
        
        last_error = None
        for attempt in range(_MAX_RETRIES):
            try:
                response = self.client.chat.completions.create(**kwargs)
                _last_call_time = time.time()  # Record successful call time
                content = response.choices[0].message.content
                # 部分模型（如MiniMax M2.5）会在content中包含<think>思考内容，需要移除
                content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()
                return content
            except Exception as e:
                error_str = str(e)
                # Catch rate-limit errors (HTTP 413 / 429 / "rate_limit_exceeded" / quota)
                if any(code in error_str.lower() for code in ('413', '429', 'rate_limit', 'tokens', 'quota', 'resource_exhausted')):
                    last_error = e
                    
                    # Try to parse the actual retry delay from the error
                    parsed_wait = _parse_retry_delay(error_str)
                    
                    if parsed_wait:
                        wait = parsed_wait
                        wait_desc = f"{wait // 3600}h{(wait % 3600) // 60}m{wait % 60}s" if wait >= 3600 else f"{wait // 60}m{wait % 60}s" if wait >= 60 else f"{wait}s"
                        logger.warning(
                            f"Rate limit hit (attempt {attempt + 1}/{_MAX_RETRIES}). "
                            f"API says retry in {wait_desc}. Waiting..."
                        )
                    else:
                        # Exponential backoff: 30s, 60s, 120s, 240s...
                        wait = min(_DEFAULT_RETRY_WAIT * (2 ** attempt), _MAX_RETRY_WAIT)
                        logger.warning(
                            f"Rate limit hit (attempt {attempt + 1}/{_MAX_RETRIES}). "
                            f"Waiting {wait}s before retry..."
                        )
                    
                    time.sleep(wait)
                else:
                    raise  # Non-rate-limit error, propagate immediately
        
        # All retries exhausted
        raise last_error
    
    def chat_json(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        发送聊天请求并返回JSON
        
        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            
        Returns:
            解析后的JSON对象
        """
        response = self.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"}
        )
        # 清理markdown代码块标记
        cleaned_response = response.strip()
        cleaned_response = re.sub(r'^```(?:json)?\s*\n?', '', cleaned_response, flags=re.IGNORECASE)
        cleaned_response = re.sub(r'\n?```\s*$', '', cleaned_response)
        cleaned_response = cleaned_response.strip()

        try:
            return json.loads(cleaned_response)
        except json.JSONDecodeError:
            raise ValueError(f"LLM返回的JSON格式无效: {cleaned_response}")

