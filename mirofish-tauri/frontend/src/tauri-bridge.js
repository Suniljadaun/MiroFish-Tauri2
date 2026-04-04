/**
 * tauri-bridge.js
 * Wraps all Tauri IPC invoke() calls so the Vue frontend
 * works both inside the Tauri webview AND in plain browser dev mode.
 */

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let _invoke = null

async function getInvoke() {
  if (_invoke) return _invoke
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core')
    _invoke = invoke
  } else {
    // Dev mode fallback: mock all commands
    _invoke = async (cmd, args) => {
      console.warn(`[tauri-bridge] mock invoke: ${cmd}`, args)
      return 'mock'
    }
  }
  return _invoke
}

export async function startBackend(config) {
  const invoke = await getInvoke()
  return invoke('start_backend', {
    llmApiKey: config.llmApiKey,
    llmBaseUrl: config.llmBaseUrl,
    llmModelName: config.llmModelName,
    zepApiKey: config.zepApiKey,
  })
}

export async function stopBackend() {
  const invoke = await getInvoke()
  return invoke('stop_backend')
}

export async function backendStatus() {
  const invoke = await getInvoke()
  return invoke('backend_status')
}

export async function setBackendReady() {
  const invoke = await getInvoke()
  return invoke('set_backend_ready')
}

export async function getBackendPort() {
  const invoke = await getInvoke()
  return invoke('get_backend_port')
}

/**
 * Poll /health until the Flask server responds 200.
 * Resolves when ready, rejects after maxWait ms.
 */
export async function waitForBackend(port = 5001, maxWait = 30000) {
  const url = `http://localhost:${port}/health`
  const interval = 800
  const deadline = Date.now() + maxWait

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (res.ok) {
        await setBackendReady()
        return true
      }
    } catch (_) {
      // still starting
    }
    await new Promise(r => setTimeout(r, interval))
  }
  throw new Error(`Backend did not start within ${maxWait / 1000}s`)
}
