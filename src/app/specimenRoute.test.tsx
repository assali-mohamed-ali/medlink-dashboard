import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

// The specimen (UI refresh B0) is a design tool for the team: there with `npm run dev`, absent from a production build.
// routes.tsx reads import.meta.env.DEV when it loads, so each test imports a fresh copy after stubbing the env.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function renderAt(path: string) {
  const { routes } = await import('./routes')
  const { default: AuthProvider } = await import('@/features/auth/AuthProvider')
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

test('in development, /__specimen shows the specimen', async () => {
  await renderAt('/__specimen')
  expect(await screen.findByRole('heading', { level: 1, name: 'Spécimen de l’interface' })).toBeInTheDocument()
})

test('in a production build, /__specimen is an unknown page', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('PROD', true)
  await renderAt('/__specimen')
  expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
})
