<template>
  <div class="launch-screen">
    <div class="launch-card">
      <!-- Animated fish swarm -->
      <div class="fish-pond">
        <div
          v-for="fish in fishes"
          :key="fish.id"
          class="fish"
          :style="fish.style"
        >🐟</div>
      </div>

      <h2>Starting MiroFish</h2>

      <div class="status-row">
        <div class="pulse-dot" :class="{ ready: isReady, error: hasError }"/>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"/>
      </div>

      <div v-if="hasError" class="error-panel">
        <p>{{ errorMessage }}</p>
        <button class="retry-btn" @click="$emit('retry')">Retry</button>
        <button class="settings-btn" @click="$emit('settings')">Edit API Keys</button>
      </div>

      <p class="tip">{{ currentTip }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  isReady: Boolean,
  hasError: Boolean,
  errorMessage: String,
})
defineEmits(['retry', 'settings'])

const TIPS = [
  'MiroFish simulates thousands of agents with independent personalities…',
  'Powered by OASIS — supports up to 1M agent interactions…',
  'GraphRAG grounds each agent in your seed documents…',
  'Zep gives agents persistent memory across simulation rounds…',
  'Once loaded, upload any document to start a prediction…',
]

const progress = ref(5)
const tipIndex = ref(0)
const statusText = ref('Initialising Python environment…')
const currentTip = computed(() => TIPS[tipIndex.value % TIPS.length])

// Animated fish
const fishes = ref(Array.from({ length: 8 }, (_, i) => ({
  id: i,
  style: {
    left: `${Math.random() * 80 + 5}%`,
    top: `${Math.random() * 70 + 10}%`,
    animationDelay: `${Math.random() * 3}s`,
    animationDuration: `${3 + Math.random() * 3}s`,
    fontSize: `${16 + Math.random() * 14}px`,
    opacity: 0.5 + Math.random() * 0.5,
  },
})))

let progressTimer, tipTimer

onMounted(() => {
  progressTimer = setInterval(() => {
    if (props.isReady) {
      progress.value = 100
      statusText.value = 'Swarm ready!'
      clearInterval(progressTimer)
      return
    }
    if (props.hasError) {
      clearInterval(progressTimer)
      return
    }
    if (progress.value < 40) statusText.value = 'Loading Python sidecar…'
    else if (progress.value < 70) statusText.value = 'Starting Flask server…'
    else statusText.value = 'Waiting for health check…'

    progress.value = Math.min(progress.value + (95 - progress.value) * 0.04, 92)
  }, 400)

  tipTimer = setInterval(() => {
    tipIndex.value++
  }, 4000)
})

onUnmounted(() => {
  clearInterval(progressTimer)
  clearInterval(tipTimer)
})
</script>

<style scoped>
.launch-screen {
  min-height: 100vh;
  background: radial-gradient(ellipse at 60% 40%, #0c1a3a 0%, #060d1f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.launch-card {
  text-align: center;
  width: 420px;
}

.fish-pond {
  position: relative;
  width: 260px;
  height: 130px;
  margin: 0 auto 28px;
  background: rgba(56,189,248,0.06);
  border-radius: 50%;
  border: 1px solid rgba(56,189,248,0.15);
}

.fish {
  position: absolute;
  animation: swim linear infinite;
}

@keyframes swim {
  0%   { transform: translateX(0) scaleX(1); }
  49%  { transform: translateX(30px) scaleX(1); }
  50%  { transform: translateX(30px) scaleX(-1); }
  100% { transform: translateX(0) scaleX(-1); }
}

h2 {
  font-size: 26px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 20px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}

.pulse-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #38bdf8;
  animation: pulse 1.4s ease-in-out infinite;
}
.pulse-dot.ready { background: #4ade80; animation: none; }
.pulse-dot.error { background: #f87171; animation: none; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.75); }
}

.status-text { color: #94a3b8; font-size: 14px; }

.progress-bar {
  background: #1e293b;
  border-radius: 99px;
  height: 4px;
  overflow: hidden;
  margin: 0 auto 24px;
  width: 280px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0ea5e9, #6366f1);
  border-radius: 99px;
  transition: width 0.4s ease;
}

.error-panel {
  background: rgba(248,113,113,0.1);
  border: 1px solid rgba(248,113,113,0.25);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
  color: #fca5a5;
  font-size: 13px;
}

.retry-btn, .settings-btn {
  margin: 8px 6px 0;
  padding: 7px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}
.retry-btn { background: #0ea5e9; color: white; }
.settings-btn { background: #1e293b; color: #94a3b8; }

.tip {
  color: #334155;
  font-size: 12.5px;
  line-height: 1.5;
  max-width: 320px;
  margin: 0 auto;
  font-style: italic;
}
</style>
