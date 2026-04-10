/**
 * config-store.js
 * Persists API keys to the macOS app data folder using @tauri-apps/plugin-store.
 * Falls back to localStorage in plain browser mode.
 */

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const LS_KEY = 'mirofish_config'

let _store = null

async function getStore() {
  if (_store) return _store
  if (isTauri) {
    const { Store } = await import('@tauri-apps/plugin-store')
    _store = await Store.load('config.json', { autoSave: true })
  }
  return _store
}

export async function saveConfig(config) {
  if (isTauri) {
    const store = await getStore()
    await store.set('config', config)
    await store.save()
  } else {
    localStorage.setItem(LS_KEY, JSON.stringify(config))
  }
}

export async function loadConfig() {
  if (isTauri) {
    const store = await getStore()
    return (await store.get('config')) || null
  } else {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  }
}

export async function clearConfig() {
  if (isTauri) {
    const store = await getStore()
    await store.delete('config')
    await store.save()
  } else {
    localStorage.removeItem(LS_KEY)
  }
}

export const DEFAULT_CONFIG = {
  llmApiKey: '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',
  llmBaseUrl: 'https://openrouter.ai/api/v1',
  llmModelName: 'google/gemini-2.0-flash-001',
  zepApiKey: 'z_1dWlkIjoiOTczM2Y2YWMtMGM5My00YTBlLTg2OTMtMDJmMjY0ZGJiMDE5In0.jcXWzZw8CJV6jgshjt_Dp4chhqSicHCdHObdU-w5BdPCJrWMrRcLJOBpXKX4uBJrQizyHOcXYrbH9XjRQzjQnA',
}
