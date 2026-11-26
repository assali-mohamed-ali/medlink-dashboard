import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const API_PROXY = { '/api': 'http://localhost:8080' }
const canUploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
)

export default defineConfig({
  // Tailwind compiles at build time into our own CSS file: nothing is loaded from elsewhere (CSP 'self')
  plugins: [
    react(),
    tailwindcss(),
    ...(canUploadSourceMaps
      ? sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          telemetry: false,
          sourcemaps: { filesToDeleteAfterUpload: './dist/**/*.map' },
        })
      : []),
  ],
  build: { sourcemap: canUploadSourceMaps ? 'hidden' : false },
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
