<template>
  <!-- Global backend loading overlay (Tauri only) -->
  <div v-if="showOverlay" class="backend-overlay">
    <div class="overlay-card">
      <div class="overlay-brand">MIROFISH</div>
      <div class="overlay-spinner"></div>
      <div class="overlay-status">{{ overlayStatus }}</div>
    </div>
  </div>

  <router-view />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  isTauri,
  hasCredentials,
  isBackendReady,
  startBackend
} from './api/tauriBackend'

const router = useRouter()

const showOverlay = ref(false)
const overlayStatus = ref('Initializing...')

const statusLabels = {
  reading_credentials: 'Reading credentials...',
  spawning: 'Starting prediction engine...',
  waiting_for_health: 'Waiting for backend...',
  ready: 'Ready!',
  timeout: 'Backend timed out',
  error: 'Startup error'
}

onMounted(async () => {
  // Only auto-start in Tauri mode with saved credentials
  if (!isTauri()) return
  if (isBackendReady()) return

  const hasCreds = await hasCredentials()
  if (!hasCreds) return // navigation guard will redirect to /setup

  // Show loading overlay and start backend silently
  showOverlay.value = true
  overlayStatus.value = 'Initializing...'

  const result = await startBackend((s) => {
    overlayStatus.value = statusLabels[s] || s
  })

  if (result.ok) {
    overlayStatus.value = 'Ready!'
    // Brief pause to show "Ready!" before hiding
    await new Promise(r => setTimeout(r, 600))
    showOverlay.value = false
  } else {
    overlayStatus.value = `Error: ${result.error}`
    // Keep overlay for 3s then hide
    await new Promise(r => setTimeout(r, 3000))
    showOverlay.value = false
  }
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'JetBrains Mono', 'Space Grotesk', 'Noto Sans SC', monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #000000;
  background-color: #ffffff;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #000000;
}

::-webkit-scrollbar-thumb:hover {
  background: #333333;
}

/* 全局按钮样式 */
button {
  font-family: inherit;
}

/* ── Backend loading overlay ──────────────────────────────── */
.backend-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.overlay-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.overlay-brand {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 3px;
  color: #000;
}

.overlay-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #E0E0E0;
  border-top-color: #FF4500;
  border-radius: 50%;
  animation: overlay-spin 0.8s linear infinite;
}

@keyframes overlay-spin {
  to { transform: rotate(360deg); }
}

.overlay-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: #888;
  letter-spacing: 0.5px;
}
</style>
