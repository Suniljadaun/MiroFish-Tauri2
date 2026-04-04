<template>
  <!-- ① No keys saved yet → show setup screen -->
  <SetupScreen v-if="phase === 'setup'" @configured="onConfigured" />

  <!-- ② Keys saved, backend starting → show launch screen -->
  <LaunchScreen
    v-else-if="phase === 'launching'"
    :isReady="backendReady"
    :hasError="launchError !== ''"
    :errorMessage="launchError"
    @retry="retryLaunch"
    @settings="phase = 'setup'"
  />

  <!-- ③ Backend ready → load the original MiroFish frontend in an iframe -->
  <div v-else-if="phase === 'app'" class="app-shell">
    <!-- Thin top bar with controls -->
    <div class="top-bar">
      <div class="top-bar-left">
        <svg width="22" height="22" viewBox="0 0 44 44" fill="none" style="flex-shrink:0">
          <circle cx="22" cy="22" r="22" fill="#0f172a"/>
          <ellipse cx="22" cy="22" rx="12" ry="7" fill="#38bdf8" opacity="0.9"/>
          <ellipse cx="22" cy="22" rx="6" ry="3" fill="#7dd3fc"/>
          <circle cx="30" cy="20" r="1.5" fill="white"/>
        </svg>
        <span class="app-name">MiroFish</span>
        <span class="badge">Swarm Running</span>
      </div>

      <div class="top-bar-right">
        <button class="bar-btn" @click="stopSwarm" :disabled="stopping">
          {{ stopping ? 'Stopping…' : '⏹ Stop Swarm' }}
        </button>
        <button class="bar-btn settings" @click="openSettings">⚙ Keys</button>
      </div>
    </div>

    <!-- MiroFish UI loaded in webview iframe pointing to local Flask+Vue server -->
    <iframe
      :src="`http://localhost:${backendPort}`"
      class="app-frame"
      allow="clipboard-read; clipboard-write"
      referrerpolicy="no-referrer"
    />

    <!-- Settings overlay -->
    <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
      <div class="settings-panel">
        <h3>API Keys</h3>
        <SetupScreen @configured="onReconfigure" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SetupScreen from './components/SetupScreen.vue'
import LaunchScreen from './components/LaunchScreen.vue'
import { loadConfig } from './config-store.js'
import { startBackend, stopBackend, waitForBackend, getBackendPort } from './tauri-bridge.js'

const phase = ref('setup')          // 'setup' | 'launching' | 'app'
const backendReady = ref(false)
const launchError = ref('')
const backendPort = ref(5001)
const stopping = ref(false)
const showSettings = ref(false)

onMounted(async () => {
  const saved = await loadConfig()
  if (saved?.llmApiKey && saved?.zepApiKey) {
    await launchWithConfig(saved)
  }
  // else stay on setup screen
})

onUnmounted(async () => {
  await stopBackend().catch(() => {})
})

async function onConfigured(config) {
  await launchWithConfig(config)
}

async function launchWithConfig(config) {
  phase.value = 'launching'
  backendReady.value = false
  launchError.value = ''

  try {
    const port = await getBackendPort()
    backendPort.value = port

    await startBackend(config)
    await waitForBackend(port, 45_000)

    backendReady.value = true
    // Short pause so user sees the "ready" state
    await new Promise(r => setTimeout(r, 600))
    phase.value = 'app'
  } catch (e) {
    launchError.value = e.message || 'Failed to start backend.'
  }
}

async function retryLaunch() {
  const config = await loadConfig()
  if (config) await launchWithConfig(config)
}

async function stopSwarm() {
  stopping.value = true
  try {
    await stopBackend()
    phase.value = 'setup'
  } finally {
    stopping.value = false
  }
}

function openSettings() {
  showSettings.value = true
}

async function onReconfigure(config) {
  showSettings.value = false
  await stopBackend().catch(() => {})
  await launchWithConfig(config)
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; }

html, body, #app {
  margin: 0; padding: 0;
  height: 100%; width: 100%;
  background: #060d1f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #060d1f;
}

.top-bar {
  height: 44px;
  background: #0a0f1e;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  /* macOS traffic-light buttons space */
  padding-left: 80px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-name {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
}

.badge {
  background: rgba(74,222,128,0.15);
  color: #4ade80;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.top-bar-right {
  display: flex;
  gap: 8px;
}

.bar-btn {
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.bar-btn:hover:not(:disabled) { background: #273549; color: #f1f5f9; }
.bar-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bar-btn.settings { color: #64748b; }

.app-frame {
  flex: 1;
  border: none;
  width: 100%;
  background: white;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.settings-panel {
  background: #111827;
  border-radius: 16px;
  padding: 32px;
  width: 560px;
  max-height: 80vh;
  overflow-y: auto;
}

.settings-panel h3 {
  color: #f1f5f9;
  margin: 0 0 24px;
  font-size: 18px;
}
</style>
