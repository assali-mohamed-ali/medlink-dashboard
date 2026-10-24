import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import SpacePage from '../../pages/SpacePage'
import { ApiError } from '../../services/apiClient'
import AuthProvider from './AuthProvider'
import ProtectedRoute from './ProtectedRoute'
import * as authService from './authService'
import type { Role } from './roles'

vi.mock('./authService', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))

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
          <Route path="/connexion" element={<p>Page de connexion</p>} />
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
