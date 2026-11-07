import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import AuthProvider from '@/features/auth/AuthProvider'
import { routes } from './routes'

// Through the real apiFetch (only fetch is faked): the API's own 401 answers drive the session state.
const fetchMock = vi.fn()

function answer(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

test('a visitor (no session at all) is not told that a session expired', async () => {
  fetchMock.mockImplementation((url: string) =>
    url === '/api/auth/me'
      ? answer(401, { code: 'UNAUTHENTICATED', message: 'Authentification requise.' })
      : answer(404),
  )
  renderAt('/patient')
  expect(await screen.findByRole('heading', { name: 'Bienvenue sur MedLink' })).toBeInTheDocument()
  expect(screen.queryByText(/session a expiré/)).toBeNull()
})
