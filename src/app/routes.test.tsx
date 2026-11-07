import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import { ApiError } from '@/shared/api/apiClient'
import { routes } from './routes'

// The real route table, with the API mocked at the auth feature's api.ts
vi.mock('@/features/auth/api', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
const fetchMe = vi.mocked(authApi.fetchMe)
const logout = vi.mocked(authApi.logout)

function loggedInAs(role: Role) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
  })
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

const SPACES = [
  ['PATIENT', '/patient', 'Espace patient'],
  ['PRACTITIONER', '/praticien', 'Espace praticien'],
  ['ADMINISTRATIVE_STAFF', '/admin', 'Espace administratif'],
] as const

beforeEach(() => {
  vi.resetAllMocks()
  fetchMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
})

test.each(SPACES)('a %s reaches their own space', async (role, path, title) => {
  loggedInAs(role)
  renderAt(path)
  expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
  expect(screen.getByText(/Amel Test/)).toBeInTheDocument()
})

test.each(
  SPACES.flatMap(([role]) =>
    SPACES.filter(([other]) => other !== role).map(([, path, title]) => [role, path, title] as const),
  ),
)('a %s opening %s gets "Accès refusé"', async (role, path, title) => {
  loggedInAs(role)
  renderAt(path)
  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: title })).toBeNull()
})

test.each(SPACES)('a visitor opening the %s space is sent to the login page', async (_role, path) => {
  const router = renderAt(path)
  expect(await screen.findByRole('heading', { name: 'Bienvenue sur MedLink' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/connexion')
})

test('"Accès refusé" leads back to the person\'s own space', async () => {
  loggedInAs('PATIENT')
  renderAt('/admin')
  const back = await screen.findByRole('link', { name: 'Retour à mon espace' })
  expect(back).toHaveAttribute('href', '/patient')
})

test('a logged-in person opening the login page goes to their space', async () => {
  loggedInAs('PRACTITIONER')
  const router = renderAt('/connexion')
  expect(await screen.findByRole('heading', { name: 'Espace praticien' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/praticien')
})

test('each space shows its own menu', async () => {
  loggedInAs('ADMINISTRATIVE_STAFF')
  renderAt('/admin')
  const menu = await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  expect(menu).toContainElement(screen.getByRole('link', { name: 'Gestion des comptes' }))
})

test('the patient menu has no staff entry', async () => {
  loggedInAs('PATIENT')
  renderAt('/patient')
  await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  expect(screen.queryByRole('link', { name: 'Gestion des comptes' })).toBeNull()
})

test('logout from a space goes back to the login page', async () => {
  loggedInAs('PATIENT')
  logout.mockResolvedValue(undefined)
  const router = renderAt('/patient')
  await userEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }))
  expect(logout).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('heading', { name: 'Bienvenue sur MedLink' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/connexion')
})

test('an unknown address shows "Page introuvable"', async () => {
  renderAt('/nimporte-quoi')
  expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
})

test('public pages stay open to visitors', async () => {
  renderAt('/inscription')
  expect(await screen.findByRole('button', { name: /Créer mon compte/ })).toBeInTheDocument()
})
