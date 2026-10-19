import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(function (config) {
  const env = loadEnv(config.mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': env.API_PROXY_TARGET
      }
    },
    preview: {
      proxy: {
        '/api': env.API_PROXY_TARGET
      }
    }
  }
})
