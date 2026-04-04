<template>
  <div class="setup-container">
    <!-- Background grid pattern -->
    <div class="grid-bg"></div>

    <div class="setup-card">
      <!-- Header -->
      <div class="setup-header">
        <div class="brand-row">
          <span class="brand-name">MIROFISH</span>
          <span class="brand-tag">DESKTOP</span>
        </div>
        <h1 class="setup-title">Configuration</h1>
        <p class="setup-subtitle">
          Enter your API credentials to power the AI prediction engine.
          These are stored locally on your machine and never sent to third parties.
        </p>
      </div>

      <!-- Error banner -->
      <div v-if="errorMsg" class="error-banner">
        <span class="error-icon">⚠</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSave" class="setup-form">
        <!-- LLM API Key (required) -->
        <div class="field-group">
          <label class="field-label">
            <span class="label-text">LLM API Key</span>
            <span class="required-badge">REQUIRED</span>
          </label>
          <div class="input-box">
            <input
              id="llm-api-key"
              v-model="form.llmApiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="sk-..."
              class="field-input mono"
              autocomplete="off"
            />
            <button type="button" class="toggle-btn" @click="showApiKey = !showApiKey">
              {{ showApiKey ? '◉' : '◎' }}
            </button>
          </div>
          <span class="field-hint">OpenAI, DeepSeek, or any OpenAI-compatible key</span>
        </div>

        <!-- LLM Base URL -->
        <div class="field-group">
          <label class="field-label">
            <span class="label-text">LLM Base URL</span>
            <span class="default-badge">DEFAULT</span>
          </label>
          <input
            id="llm-base-url"
            v-model="form.llmBaseUrl"
            type="text"
            placeholder="https://api.openai.com/v1"
            class="field-input mono"
          />
          <span class="field-hint">Change this if using a custom endpoint (e.g. DeepSeek, Azure)</span>
        </div>

        <!-- LLM Model Name -->
        <div class="field-group">
          <label class="field-label">
            <span class="label-text">Model Name</span>
            <span class="default-badge">DEFAULT</span>
          </label>
          <input
            id="llm-model-name"
            v-model="form.llmModelName"
            type="text"
            placeholder="gpt-4o-mini"
            class="field-input mono"
          />
        </div>

        <!-- Zep API Key (optional) -->
        <div class="field-group">
          <label class="field-label">
            <span class="label-text">Zep API Key</span>
            <span class="optional-badge">OPTIONAL</span>
          </label>
          <input
            id="zep-api-key"
            v-model="form.zepApiKey"
            type="password"
            placeholder="z_..."
            class="field-input mono"
          />
          <span class="field-hint">Required for long-term agent memory (GraphRAG)</span>
        </div>

        <!-- Status indicator -->
        <div v-if="status" class="status-bar">
          <span class="status-dot" :class="statusClass"></span>
          <span class="status-text">{{ status }}</span>
        </div>

        <!-- Submit -->
        <button
          id="save-launch-btn"
          type="submit"
          class="save-btn"
          :disabled="!canSave || launching"
        >
          <span v-if="!launching">Save & Launch Engine →</span>
          <span v-else class="launching-text">
            <span class="spinner"></span>
            Starting backend...
          </span>
        </button>
      </form>

      <!-- Footer -->
      <div class="setup-footer">
        <span class="footer-note">
          You can change these settings later from the app menu.
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { saveCredentials, startBackend, isTauri } from '../api/tauriBackend'

const router = useRouter()

const form = ref({
  llmApiKey: '',
  llmBaseUrl: 'https://api.openai.com/v1',
  llmModelName: 'gpt-4o-mini',
  zepApiKey: ''
})

const showApiKey = ref(false)
const launching = ref(false)
const errorMsg = ref('')
const status = ref('')

const statusClass = computed(() => {
  if (status.value.includes('ready') || status.value.includes('Ready')) return 'dot-green'
  if (status.value.includes('error') || status.value.includes('Error') || status.value.includes('timeout')) return 'dot-red'
  return 'dot-orange'
})

const canSave = computed(() => {
  return form.value.llmApiKey.trim().length > 0
})

const statusMessages = {
  reading_credentials: 'Reading credentials...',
  spawning: 'Spawning backend engine...',
  waiting_for_health: 'Waiting for backend to initialize...',
  ready: '✓ Backend ready!',
  timeout: 'Backend failed to start within 60s',
  error: 'Backend startup error'
}

async function handleSave () {
  if (!canSave.value || launching.value) return

  launching.value = true
  errorMsg.value = ''
  status.value = ''

  try {
    // Save credentials
    if (isTauri()) {
      await saveCredentials({
        llmApiKey: form.value.llmApiKey.trim(),
        llmBaseUrl: form.value.llmBaseUrl.trim(),
        llmModelName: form.value.llmModelName.trim(),
        zepApiKey: form.value.zepApiKey.trim()
      })
    }

    // Start backend
    const result = await startBackend((s) => {
      status.value = statusMessages[s] || s
    })

    if (result.ok) {
      status.value = '✓ Backend ready! Redirecting...'
      await new Promise(r => setTimeout(r, 800))
      router.replace('/')
    } else {
      errorMsg.value = result.error || 'Failed to start backend'
      launching.value = false
    }
  } catch (err) {
    errorMsg.value = String(err)
    launching.value = false
  }
}
</script>

<style scoped>
/* ── Variables ───────────────────────────────────────────── */
:root {
  --s-black: #000000;
  --s-white: #FFFFFF;
  --s-orange: #FF4500;
  --s-gray: #888888;
  --s-border: #E0E0E0;
  --s-bg: #FAFAFA;
  --s-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --s-font-sans: 'Space Grotesk', 'Inter', system-ui, sans-serif;
}

/* ── Container ───────────────────────────────────────────── */
.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--s-white);
  position: relative;
  overflow: hidden;
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

/* ── Card ────────────────────────────────────────────────── */
.setup-card {
  position: relative;
  width: 100%;
  max-width: 540px;
  border: 1px solid var(--s-border);
  background: var(--s-white);
  padding: 48px 44px;
  z-index: 1;
}

/* ── Header ──────────────────────────────────────────────── */
.setup-header {
  margin-bottom: 36px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.brand-name {
  font-family: var(--s-font-mono);
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 2px;
  color: var(--s-black);
}

.brand-tag {
  font-family: var(--s-font-mono);
  font-weight: 700;
  font-size: 0.65rem;
  letter-spacing: 1px;
  background: var(--s-orange);
  color: var(--s-white);
  padding: 2px 8px;
}

.setup-title {
  font-family: var(--s-font-sans);
  font-size: 2rem;
  font-weight: 500;
  letter-spacing: -0.5px;
  color: var(--s-black);
  margin: 0 0 12px 0;
}

.setup-subtitle {
  font-family: var(--s-font-sans);
  font-size: 0.9rem;
  color: var(--s-gray);
  line-height: 1.6;
  margin: 0;
}

/* ── Error ───────────────────────────────────────────────── */
.error-banner {
  background: #FFF5F5;
  border: 1px solid #FFD4D4;
  padding: 12px 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--s-font-mono);
  font-size: 0.8rem;
  color: #CC0000;
}

.error-icon {
  font-size: 1rem;
}

/* ── Form ────────────────────────────────────────────────── */
.setup-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label-text {
  font-family: var(--s-font-sans);
  font-size: 0.85rem;
  font-weight: 520;
  color: var(--s-black);
}

.required-badge {
  font-family: var(--s-font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 1px;
  background: var(--s-orange);
  color: var(--s-white);
  padding: 1px 6px;
}

.default-badge {
  font-family: var(--s-font-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 1px;
  background: #F0F0F0;
  color: #999;
  padding: 1px 6px;
}

.optional-badge {
  font-family: var(--s-font-mono);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 1px;
  background: #F0F0F0;
  color: #999;
  padding: 1px 6px;
}

.input-box {
  position: relative;
  display: flex;
}

.field-input {
  width: 100%;
  border: 1px solid var(--s-border);
  padding: 10px 14px;
  font-size: 0.9rem;
  background: var(--s-bg);
  color: var(--s-black);
  outline: none;
  transition: border-color 0.2s;
}

.field-input:focus {
  border-color: var(--s-black);
}

.field-input.mono {
  font-family: var(--s-font-mono);
  font-size: 0.82rem;
}

.toggle-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 44px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  color: var(--s-gray);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  color: var(--s-black);
}

.field-hint {
  font-family: var(--s-font-mono);
  font-size: 0.7rem;
  color: #BBB;
}

/* ── Status ──────────────────────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--s-bg);
  border: 1px solid var(--s-border);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-orange {
  background: var(--s-orange);
  animation: pulse 1.2s ease-in-out infinite;
}

.dot-green {
  background: #22C55E;
}

.dot-red {
  background: #EF4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-family: var(--s-font-mono);
  font-size: 0.78rem;
  color: var(--s-gray);
}

/* ── Button ──────────────────────────────────────────────── */
.save-btn {
  width: 100%;
  padding: 14px 24px;
  background: var(--s-black);
  color: var(--s-white);
  border: none;
  font-family: var(--s-font-sans);
  font-size: 0.95rem;
  font-weight: 520;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.3px;
  margin-top: 4px;
}

.save-btn:hover:not(:disabled) {
  background: #222;
}

.save-btn:disabled {
  background: #CCC;
  cursor: not-allowed;
}

.launching-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: var(--s-white);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Footer ──────────────────────────────────────────────── */
.setup-footer {
  margin-top: 28px;
  text-align: center;
}

.footer-note {
  font-family: var(--s-font-mono);
  font-size: 0.7rem;
  color: #BBB;
}
</style>
