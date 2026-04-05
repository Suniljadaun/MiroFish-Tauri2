import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Stub plugin: resolves @tauri-apps/* to empty modules during dev
// (these packages are only available inside the Tauri webview shell)
function tauriDevStub() {
  return {
    name: 'tauri-dev-stub',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith('@tauri-apps/')) return `\0tauri-stub:${id}`
    },
    load(id) {
      if (id.startsWith('\0tauri-stub:')) {
        return 'export default {}; export const load = () => Promise.resolve({}); export const invoke = () => Promise.resolve(); export const Command = class {};'
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tauriDevStub()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@locales': path.resolve(__dirname, '../locales')
    }
  },
  build: {
    rollupOptions: {
      // Tauri packages are provided by the Tauri runtime, not bundled by Vite
      external: [
        '@tauri-apps/api',
        '@tauri-apps/api/core',
        '@tauri-apps/api/event',
        '@tauri-apps/plugin-shell',
        '@tauri-apps/plugin-store',
        '@tauri-apps/plugin-fs'
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      '@tauri-apps/api',
      '@tauri-apps/plugin-shell',
      '@tauri-apps/plugin-store',
      '@tauri-apps/plugin-fs'
    ]
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
