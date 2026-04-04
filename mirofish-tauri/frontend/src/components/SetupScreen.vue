<template>
  <div class="setup-screen">
    <div class="setup-card">
      <!-- Logo -->
      <div class="logo-row">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="22" fill="#0f172a"/>
          <ellipse cx="22" cy="22" rx="12" ry="7" fill="#38bdf8" opacity="0.9"/>
          <ellipse cx="22" cy="22" rx="6" ry="3" fill="#7dd3fc"/>
          <circle cx="30" cy="20" r="1.5" fill="white"/>
        </svg>
        <span class="logo-text">MiroFish</span>
      </div>

      <h1>Configure Your Keys</h1>
      <p class="subtitle">
        MiroFish needs two API keys to run the swarm locally.<br/>
        These are stored securely on your Mac and never sent anywhere else.
      </p>

      <form @submit.prevent="handleSave">
        <!-- LLM Section -->
        <div class="section-label">LLM Provider (OpenAI-compatible)</div>

        <div class="field">
          <label>API Key <span class="req">*</span></label>
          <input
            v-model="form.llmApiKey"
            type="password"
            placeholder="sk-... or your provider key"
            autocomplete="off"
            required
          />
          <span class="hint">
            Works with OpenAI, Alibaba Qwen, Groq, or any OpenAI-compatible API.
          </span>
        </div>

        <div class="field">
          <label>Base URL</label>
          <input
            v-model="form.llmBaseUrl"
            type="text"
            placeholder="https://api.openai.com/v1"
          />
          <span class="hint">Leave default for OpenAI. For Qwen: https://dashscope.aliyuncs.com/compatible-mode/v1</span>
        </div>

        <div class="field">
          <label>Model Name</label>
          <input
            v-model="form.llmModelName"
            type="text"
            placeholder="gpt-4o-mini"
          />
          <span class="hint">Recommended: qwen-plus (low cost) or gpt-4o-mini</span>
        </div>

        <!-- Zep Section -->
        <div class="section-label" style="margin-top: 24px;">
          Zep Cloud — Agent Memory
          <a href="#" class="ext-link" @click.prevent="openZep">Get free key ↗</a>
        </div>

        <div class="field">
          <label>Zep API Key <span class="req">*</span></label>
          <input
            v-model="form.zepApiKey"
            type="password"
            placeholder="z_..."
            autocomplete="off"
            required
          />
          <span class="hint">Free tier at app.getzep.com — no credit card needed.</span>
        </div>

        <!-- Error -->
        <div v-if="error" class="error-box">{{ error }}</div>

        <button type="submit" class="primary-btn" :disabled="saving">
          <span v-if="saving" class="spinner"/>
          {{ saving ? 'Saving…' : 'Save & Launch Swarm' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { saveConfig, loadConfig, DEFAULT_CONFIG } from '../config-store.js'

const emit = defineEmits(['configured'])

const form = ref({ ...DEFAULT_CONFIG })
const saving = ref(false)
const error = ref('')

onMounted(async () => {
  const saved = await loadConfig()
  if (saved) form.value = { ...DEFAULT_CONFIG, ...saved }
})

async function handleSave() {
  error.value = ''
  if (!form.value.llmApiKey.trim()) {
    error.value = 'LLM API Key is required.'
    return
  }
  if (!form.value.zepApiKey.trim()) {
    error.value = 'Zep API Key is required.'
    return
  }
  saving.value = true
  try {
    await saveConfig({ ...form.value })
    emit('configured', { ...form.value })
  } catch (e) {
    error.value = `Failed to save: ${e.message}`
  } finally {
    saving.value = false
  }
}

async function openZep() {
  if (window.__TAURI_INTERNALS__) {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open('https://app.getzep.com/')
  } else {
    window.open('https://app.getzep.com/', '_blank')
  }
}
</script>

<style scoped>
.setup-screen {
  min-height: 100vh;
  background: #0a0f1e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.setup-card {
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: -0.3px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 8px;
}

.subtitle {
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 28px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #38bdf8;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ext-link {
  font-size: 11px;
  color: #38bdf8;
  text-decoration: none;
  opacity: 0.7;
}
.ext-link:hover { opacity: 1; }

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
  margin-bottom: 6px;
}

.req { color: #f87171; }

.field input {
  width: 100%;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 10px 14px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.field input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56,189,248,0.12);
}

.hint {
  display: block;
  font-size: 11.5px;
  color: #475569;
  margin-top: 5px;
  line-height: 1.4;
}

.error-box {
  background: rgba(248,113,113,0.1);
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 16px;
}

.primary-btn {
  width: 100%;
  background: linear-gradient(135deg, #0ea5e9, #3b82f6);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  padding: 13px;
  cursor: pointer;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s, transform 0.1s;
}

.primary-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.primary-btn:active:not(:disabled) { transform: translateY(0); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
