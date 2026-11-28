import { render, screen, within } from '@testing-library/react'
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
  activateAccount: vi.fn(),
  changePassword: vi.fn(),
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  currentConsent: vi.fn(async () => ({ version: 'test-policy', text: 'Texte de test', required: false })),
  resendActivation: vi.fn(),
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

// ---- Password change (MLink-89): a page of each space, not a public page (code owner's review on #11) ----

const PASSWORD_PAGES = SPACES.map(([role, root, title]) => [role, `${root}/mot-de-passe`, title] as const)

test.each(PASSWORD_PAGES)('a %s changes the password inside their space (%s)', async (role, path, title) => {
  loggedInAs(role)
  renderAt(path)
  expect(await screen.findByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
  // Still in the space: its title, who is logged in, logout, and the menu entry of this page marked current
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  expect(screen.getByText(/Amel Test/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
  // Every space reaches it from "Profil" (no "Mot de passe" entry in the menu), which stays marked
  const menu = within(screen.getByRole('navigation', { name: 'Menu de l’espace' }))
  const entry = menu.getByRole('link', { name: 'Profil' })
  expect(entry).toHaveAttribute('href', path.replace('mot-de-passe', 'profil'))
  expect(entry).toHaveAttribute('aria-current', 'page')
  // Not the public site's header, which made the person look logged out
  expect(screen.queryByRole('link', { name: 'Créer un compte' })).toBeNull()
})

test.each(SPACES)('a logged-in %s opening /mot-de-passe goes to the password page of their space', async (role, root) => {
  loggedInAs(role)
  const router = renderAt('/mot-de-passe')
  expect(await screen.findByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe(`${root}/mot-de-passe`)
})

test('a patient opening the practitioner password page gets "Accès refusé"', async () => {
  loggedInAs('PATIENT')
  renderAt('/praticien/mot-de-passe')
  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
})

test('a visitor opening a space password page is sent to the login page', async () => {
  const router = renderAt('/patient/mot-de-passe')
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

test('the activation link of the mail opens the activation page, without a session (no longer a placeholder)', async () => {
  renderAt('/activer-compte?token=mail-token-1')

  expect(await screen.findByRole('heading', { level: 1, name: 'Activez votre compte' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Activer mon compte' })).toBeInTheDocument()
  expect(screen.queryByText('Activation du compte')).toBeNull()
})

const BACKLOG_PAGES = [
  ['PATIENT', '/patient/resultats', 'Mes résultats d’examens'],
  ['PRACTITIONER', '/praticien/patients', 'Mes patients'],
  ['PRACTITIONER', '/praticien/absences', 'Mes absences'],
  ['ADMINISTRATIVE_STAFF', '/admin/reservation', 'Réserver pour un patient'],
  ['ADMINISTRATIVE_STAFF', '/admin/comptes/affectations', 'Affectations aux cliniques'],
  ['ADMINISTRATIVE_STAFF', '/admin/demandes-suppression', 'Demandes de suppression'],
] as const

test.each(BACKLOG_PAGES)('the %s can open %s', async (role, path, title) => {
  loggedInAs(role)
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    const body = url.endsWith('/filters') || url.endsWith('/profile-choices')
      ? { clinics: [], specialties: [], practitioners: [] }
      : url.includes('/practitioner/patients') || url.includes('/results/me')
        ? { items: [], page: 0, size: 20, total: 0, unseen: 0 }
        : []
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  })
  try {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: title })).toBeVisible()
  } finally {
    http.mockRestore()
  }
})

test.each(BACKLOG_PAGES)('another role cannot open a %s backlog page at %s', async (role, path, title) => {
  loggedInAs(role === 'PATIENT' ? 'PRACTITIONER' : 'PATIENT')
  renderAt(path)
  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: title })).toBeNull()
})
