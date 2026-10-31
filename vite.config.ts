import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const API_PROXY = { '/api': 'http://localhost:8080' }

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Same alias as tsconfig.app.json "paths": @/x = src/x
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Port 3000 = the API's APP_FRONTEND_URL in dev: the links it mails (verify e-mail, code setup) open here.
  // /api goes to the API, so the browser sees one origin (no CORS, SameSite=Strict cookies are sent).
  server: { port: 3000, strictPort: true, proxy: API_PROXY },
  // `npm run preview` serves the production build the same way
  preview: { port: 3000, strictPort: true, proxy: API_PROXY },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
    fileParallelism: false,
  },
})
