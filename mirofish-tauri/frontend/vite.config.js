import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// In Tauri dev mode, the Tauri CLI sets this env var
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: 'ws', host, port: 3001 }
      : undefined,
    watch: {
      // Tell Vite to ignore watching the src-tauri folder
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    // Tauri uses Chromium so we can target modern ES
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
