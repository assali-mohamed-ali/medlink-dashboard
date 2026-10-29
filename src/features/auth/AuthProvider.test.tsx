import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import SpacePage from '@/pages/SpacePage'
import * as apiClient from '@/shared/api/apiClient'
import { ApiError } from '@/shared/api/apiClient'
import AuthProvider from './AuthProvider'
import ProtectedRoute from './ProtectedRoute'
import * as authService from './api'
import type { Role } from './roles'
import { useAuth } from './useAuth'

vi.mock('./api', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

// Keep the real ApiError; capture the handler AuthProvider registers for ended sessions
vi.mock('@/shared/api/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/apiClient')>()),
  setUnauthorizedHandler: vi.fn(),
}))
const setUnauthorizedHandler = vi.mocked(apiClient.setUnauthorizedHandler)

/** What the API client does when any call answers 401 SESSION_EXPIRED. */
function endTheSessionFromTheApi() {
  const handler = setUnauthorizedHandler.mock.calls.findLast(([h]) => h !== null)?.[0]
  if (!handler) throw new Error('AuthProvider registered no handler')
  act(() => handler(new ApiError(401, 'SESSION_EXPIRED', 'Session expirée.')))
}

function LoginPlaceholder() {
  const expired = (useLocation().state as { sessionExpired?: boolean } | null)?.sessionExpired
  return <p>Page de connexion{expired ? ' (session expirée)' : ''}</p>
}

/** Shows the session as a page would read it. */
function SessionProbe() {
  const { status, role, user } = useAuth()
  return <p data-testid="probe">{`${status} ${role ?? 'none'} ${user?.firstName ?? ''}`.trim()}</p>
}

const fetchMe = vi.mocked(authService.fetchMe)
const logout = vi.mocked(authService.logout)

function userWithRole(role: Role) {
  return {
    id: 'a1b2',
    email: 'amel@example.com',
    firstName: 'Amel',
    lastName: 'Test',
    roles: [role],
  }
}

function renderApp(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/connexion" element={<LoginPlaceholder />} />
          <Route path="/probe" element={<SessionProbe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/patient" element={<SpacePage title="Espace patient" />} />
            <Route path="/praticien" element={<SpacePage title="Espace praticien" />} />
            <Route path="/admin" element={<SpacePage title="Espace administratif" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

test.each([
  ['PATIENT', '/patient', 'Espace patient'],
  ['PRACTITIONER', '/praticien', 'Espace praticien'],
  ['ADMINISTRATIVE_STAFF', '/admin', 'Espace administratif'],
] as const)('a %s reaches their own space', async (role, path, title) => {
  fetchMe.mockResolvedValue({ user: userWithRole(role) })
  renderApp(path)
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
})

test('a logged-out user is sent to /connexion', async () => {
  fetchMe.mockRejectedValue(
    new ApiError(401, 'UNAUTHENTICATED', 'Vous n’êtes pas connecté.'),
  )
  renderApp('/patient')
  expect(await screen.findByText('Page de connexion')).toBeInTheDocument()
})

test('logout clears the state and goes back to /connexion', async () => {
  fetchMe.mockResolvedValue({ user: userWithRole('PATIENT') })
  logout.mockResolvedValue(undefined)
  const user = userEvent.setup()
  renderApp('/patient')

  await user.click(await screen.findByRole('button', { name: 'Se déconnecter' }))

  expect(logout).toHaveBeenCalledTimes(1)
  expect(await screen.findByText('Page de connexion')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Espace patient' })).toBeNull()
})

test('restores the session from the API on page load (one role per person)', async () => {
  fetchMe.mockResolvedValue({ user: userWithRole('PRACTITIONER') })
  renderApp('/probe')
  expect(screen.getByTestId('probe')).toHaveTextContent('loading none')
  expect(await screen.findByText('authenticated PRACTITIONER Amel')).toBeInTheDocument()
})

test('a page load without a session, or with the API unreachable, is anonymous', async () => {
  fetchMe.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur.'))
  renderApp('/probe')
  expect(await screen.findByText('anonymous none')).toBeInTheDocument()
})

test('completeLogin opens the session (used after the MFA code)', async () => {
  fetchMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
  function Finish() {
    const { completeLogin } = useAuth()
    return (
      <button type="button" onClick={() => completeLogin(userWithRole('ADMINISTRATIVE_STAFF'))}>
        Valider
      </button>
    )
  }
  render(
    <AuthProvider>
      <Finish />
      <SessionProbe />
    </AuthProvider>,
  )
  await screen.findByText('anonymous none')
  await userEvent.click(screen.getByRole('button', { name: 'Valider' }))
  expect(screen.getByTestId('probe')).toHaveTextContent('authenticated ADMINISTRATIVE_STAFF Amel')
})

test('a session the API ends logs the user out and the login page says why', async () => {
  fetchMe.mockResolvedValue({ user: userWithRole('PATIENT') })
  renderApp('/patient')
  await screen.findByRole('heading', { name: 'Espace patient' })

  endTheSessionFromTheApi()

  expect(await screen.findByText('Page de connexion (session expirée)')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Espace patient' })).toBeNull()
})

test('a normal logout is not reported as an expired session', async () => {
  fetchMe.mockResolvedValue({ user: userWithRole('PATIENT') })
  logout.mockResolvedValue(undefined)
  renderApp('/patient')
  await userEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }))
  expect(await screen.findByText('Page de connexion')).toBeInTheDocument()
})
