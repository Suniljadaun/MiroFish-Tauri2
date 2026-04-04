import axios from 'axios'
import i18n from '../i18n'
import { isTauri, isBackendReady, getBackendPort } from './tauriBackend'

// ── Base URL resolution ──────────────────────────────────────────
// In Tauri mode the port comes from the sidecar state.
// In browser dev mode, VITE_API_BASE_URL or localhost:5001.
let _resolvedBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

async function resolveBaseURL () {
  if (isTauri()) {
    try {
      const port = await getBackendPort()
      _resolvedBaseURL = `http://localhost:${port}`
    } catch {
      // fallback
    }
  }
  return _resolvedBaseURL
}

// Eagerly resolve on import (non-blocking)
resolveBaseURL()

// 创建axios实例
const service = axios.create({
  baseURL: _resolvedBaseURL,
  timeout: 300000, // 5分钟超时（本体生成可能需要较长时间）
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  async config => {
    config.headers['Accept-Language'] = i18n.global.locale.value

    // In Tauri mode, wait for backend and use resolved base URL
    if (isTauri()) {
      // Update baseURL in case it was resolved after axios instance creation
      config.baseURL = _resolvedBaseURL

      // Wait for backend readiness (up to 60s)
      if (!isBackendReady()) {
        let waited = 0
        while (!isBackendReady() && waited < 60000) {
          await new Promise(r => setTimeout(r, 500))
          waited += 500
        }
        if (!isBackendReady()) {
          return Promise.reject(new Error('Backend sidecar is not ready'))
        }
      }
    }

    return config
  },
  error => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器（容错重试机制）
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果返回的状态码不是success，则抛出错误
    if (!res.success && res.success !== undefined) {
      console.error('API Error:', res.error || res.message || 'Unknown error')
      return Promise.reject(new Error(res.error || res.message || 'Error'))
    }
    
    return res
  },
  error => {
    console.error('Response error:', error)
    
    // 处理超时
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      console.error('Request timeout')
    }
    
    // 处理网络错误
    if (error.message === 'Network Error') {
      console.error('Network error - please check your connection')
    }
    
    return Promise.reject(error)
  }
)

// 带重试的请求函数
export const requestWithRetry = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      console.warn(`Request failed, retrying (${i + 1}/${maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
}

export default service
