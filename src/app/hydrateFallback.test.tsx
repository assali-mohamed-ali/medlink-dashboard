import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import AuthProvider from '@/features/auth/AuthProvider'
import { routes } from './routes'

// A lazy page opened first (a refresh on /connexion) renders nothing until its chunk arrives. Without a
// fallback React Router warns "No `HydrateFallback` element provided" and the screen stays blank meanwhile.
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('the first lazy page shows a loader while it downloads, with no router warning', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const router = createMemoryRouter(routes, { initialEntries: ['/connexion'] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('HydrateFallback'))
})
