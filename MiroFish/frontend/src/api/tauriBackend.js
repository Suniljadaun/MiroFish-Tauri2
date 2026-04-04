/**
 * tauriBackend.js
 * Thin wrapper for Tauri sidecar lifecycle management.
 * Detects Tauri runtime, reads credentials from the plugin-store,
 * invokes start_backend, and polls the sidecar health endpoint.
 */

// ── Runtime detection ────────────────────────────────────────────
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}

// ── Store helpers ────────────────────────────────────────────────
let _store = null

async function getStore () {
  if (_store) return _store
  if (!isTauri()) return null
  const { load } = await import('@tauri-apps/plugin-store')
  _store = await load('settings.json', { autoSave: true })
  return _store
}

/**
 * Read all saved credentials from the Tauri persistent store.
 * Returns null if any required key is missing.
 */
export async function getCredentials () {
  const store = await getStore()
  if (!store) return null

  const llmApiKey = await store.get('LLM_API_KEY')
  const llmBaseUrl = await store.get('LLM_BASE_URL')
  const llmModelName = await store.get('LLM_MODEL_NAME')
  const zepApiKey = await store.get('ZEP_API_KEY')

  // LLM_API_KEY is mandatory; others have defaults
  if (!llmApiKey) return null

  return {
    llmApiKey,
    llmBaseUrl: llmBaseUrl || 'https://api.openai.com/v1',
    llmModelName: llmModelName || 'gpt-4o-mini',
    zepApiKey: zepApiKey || ''
  }
}

/**
 * Save credentials to the Tauri persistent store.
 */
export async function saveCredentials ({ llmApiKey, llmBaseUrl, llmModelName, zepApiKey }) {
  const store = await getStore()
  if (!store) return
  await store.set('LLM_API_KEY', llmApiKey)
  await store.set('LLM_BASE_URL', llmBaseUrl || 'https://api.openai.com/v1')
  await store.set('LLM_MODEL_NAME', llmModelName || 'gpt-4o-mini')
  await store.set('ZEP_API_KEY', zepApiKey || '')
  await store.save()
}

/**
 * Check whether credentials have been saved previously.
 */
export async function hasCredentials () {
  const creds = await getCredentials()
  return creds !== null
}

// ── Sidecar lifecycle ────────────────────────────────────────────

let _backendReady = false
let _backendStarting = false

export function isBackendReady () {
  return _backendReady
}

export function isBackendStarting () {
  return _backendStarting
}

/**
 * Get the port the backend sidecar is configured to use.
 */
export async function getBackendPort () {
  if (!isTauri()) return 5001
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_backend_port')
}

/**
 * Poll the backend health endpoint until it responds 200.
 * @param {number} port
 * @param {number} maxAttempts
 * @param {number} intervalMs
 * @returns {Promise<boolean>}
 */
async function pollHealth (port, maxAttempts = 60, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      if (res.ok) return true
    } catch {
      // not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  return false
}

/**
 * Start the Python sidecar backend via Tauri command.
 * Reads credentials from store, spawns the process, waits for health.
 *
 * @param {Function} onStatusChange  callback(status: string)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function startBackend (onStatusChange) {
  if (!isTauri()) {
    _backendReady = true
    return { ok: true }
  }

  if (_backendReady) return { ok: true }
  if (_backendStarting) return { ok: false, error: 'Already starting' }

  _backendStarting = true
  onStatusChange?.('reading_credentials')

  try {
    const creds = await getCredentials()
    if (!creds) {
      _backendStarting = false
      return { ok: false, error: 'No credentials configured' }
    }

    onStatusChange?.('spawning')

    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke('start_backend', {
      llmApiKey: creds.llmApiKey,
      llmBaseUrl: creds.llmBaseUrl,
      llmModelName: creds.llmModelName,
      zepApiKey: creds.zepApiKey
    })

    if (result === 'already_running') {
      _backendReady = true
      _backendStarting = false
      return { ok: true }
    }

    onStatusChange?.('waiting_for_health')

    const port = await getBackendPort()
    const healthy = await pollHealth(port)

    if (healthy) {
      await invoke('set_backend_ready')
      _backendReady = true
      _backendStarting = false
      onStatusChange?.('ready')
      return { ok: true }
    } else {
      _backendStarting = false
      onStatusChange?.('timeout')
      return { ok: false, error: 'Backend did not become healthy within 60s' }
    }
  } catch (err) {
    _backendStarting = false
    onStatusChange?.('error')
    return { ok: false, error: String(err) }
  }
}

/**
 * Stop the sidecar backend.
 */
export async function stopBackend () {
  if (!isTauri()) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('stop_backend')
  _backendReady = false
}
