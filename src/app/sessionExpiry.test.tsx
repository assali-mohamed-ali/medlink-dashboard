import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  return router
}

const patient = { id: 'u1', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: ['PATIENT'] }
const STRONG = 'Nouveau-Mot-2026!'

/** A logged-in patient; POST /api/auth/password answers `password`; the CSRF cookie call answers 204. */
function patientChangingPassword(password: () => Promise<Response>) {
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/auth/me') return answer(200, { user: patient })
    if (url === '/api/auth/password') return password()
    return answer(204)
  })
}

async function changeOwnPassword() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/^Mot de passe actuel/), 'Ancien-Mot-2025!')
  await user.type(screen.getByLabelText(/^Nouveau mot de passe/), STRONG)
  await user.type(screen.getByLabelText(/^Confirmez le nouveau mot de passe/), STRONG)
  await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
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

// ---- Own password change inside the space (MLink-89): the API ends the session either way ----

test('own change, 204: the login page says the password changed, not that the session expired', async () => {
  patientChangingPassword(() => answer(204))
  const router = renderAt('/patient/mot-de-passe')
  await changeOwnPassword()
  expect(await screen.findByText(/Mot de passe changé/)).toBeInTheDocument()
  expect(screen.queryByText(/session a expiré/)).toBeNull()
  // No page kept to come back to: after the next login the person lands on their space's home
  expect(router.state.location.pathname).toBe('/connexion')
  expect(router.state.location.state).toEqual({ passwordChanged: true })
})

test('own change, 401 SESSION_EXPIRED (staff forced a reset meanwhile): the login page says the session expired', async () => {
  patientChangingPassword(() =>
    answer(401, { code: 'SESSION_EXPIRED', message: 'Votre session a expiré. Reconnectez-vous.' }),
  )
  const router = renderAt('/patient/mot-de-passe')
  await changeOwnPassword()
  expect(await screen.findByText(/session a expiré/)).toBeInTheDocument()
  expect(screen.queryByText(/Mot de passe changé/)).toBeNull()
  expect(router.state.location.pathname).toBe('/connexion')
})
