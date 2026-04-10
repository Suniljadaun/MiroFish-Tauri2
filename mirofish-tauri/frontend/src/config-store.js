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
  llmBaseUrl: 'https://api.groq.com/openai/v1',
  llmModelName: 'llama-3.3-70b-versatile',
  zepApiKey: 'z_1dWlkIjoiOTczM2Y2YWMtMGM5My00YTBlLTg2OTMtMDJmMjY0ZGJiMDE5In0.jcXWzZw8CJV6jgshjt_Dp4chhqSicHCdHObdU-w5BdPCJrWMrRcLJOBpXKX4uBJrQizyHOcXYrbH9XjRQzjQnA',
}
