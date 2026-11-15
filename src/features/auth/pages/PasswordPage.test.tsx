import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import AuthProvider from '../AuthProvider'
import { useAuth } from '../useAuth'
import * as api from '../api'
import PasswordPage from './PasswordPage'

vi.mock('../api', () => ({ changePassword: vi.fn(), fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
const changePassword = vi.mocked(api.changePassword)

const patient = {
  id: 'u1',
  email: 'patient@example.com',
  firstName: 'Amel',
  lastName: 'Trabelsi',
  roles: ['PATIENT' as const],
}
const STRONG = 'Nouveau-Mot-2026!'

// Shows why the app came to the login page, the way LoginPage reads it, and the session the page finds there
function LoginStub() {
  const state = useLocation().state as Record<string, boolean> | null
  const { status } = useAuth()
  return (
    <>
      <p>Page connexion {JSON.stringify(state ?? {})}</p>
      <p data-testid="session">{status}</p>
    </>
  )
}

function renderPage(state?: { forced?: boolean }) {
  const router = createMemoryRouter(
    [
      { path: '/mot-de-passe', element: <PasswordPage /> },
      { path: '/connexion', element: <LoginStub /> },
      { path: '/patient/mot-de-passe', element: <p>Page mot de passe de l’espace</p> },
    ],
    { initialEntries: [{ pathname: '/mot-de-passe', state }] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

const loggedIn = () => vi.mocked(api.fetchMe).mockResolvedValue({ user: patient })
const anonymous = () =>
  vi.mocked(api.fetchMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))

async function fill(fields: { next: string; confirm: string }) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Nouveau mot de passe/), fields.next)
  await user.type(screen.getByLabelText(/^Confirmez le nouveau mot de passe/), fields.confirm)
  await user.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ---- Forced change (login answered passwordChangeRequired: no session yet) ----

test('forced: asks only for the new password, twice, and explains why', async () => {
  anonymous()
  renderPage({ forced: true })
  expect(await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })).toBeInTheDocument()
  expect(screen.queryByLabelText(/^Mot de passe actuel/)).toBeNull()
  expect(screen.getByLabelText(/^Nouveau mot de passe/)).toHaveAttribute('autocomplete', 'new-password')
  expect(screen.getByLabelText(/^Confirmez le nouveau mot de passe/)).toHaveAttribute('autocomplete', 'new-password')
})

test('forced: a public page (no session yet, so no space around it)', async () => {
  anonymous()
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  expect(screen.getByRole('banner')).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Menu de l’espace' })).toBeNull()
})

test('forced: 204 sends only the new password, then the login page says to log in again', async () => {
  anonymous()
  changePassword.mockResolvedValue(undefined)
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  await fill({ next: STRONG, confirm: STRONG })
  expect(changePassword).toHaveBeenCalledWith({ newPassword: STRONG })
  expect(await screen.findByText(/Page connexion .*"passwordChanged":true/)).toBeInTheDocument()
})

test('forced: the 5-minute step is over (401 UNAUTHORIZED): back to the login page, which says so', async () => {
  anonymous()
  changePassword.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Connectez-vous pour changer votre mot de passe.'))
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  await fill({ next: STRONG, confirm: STRONG })
  expect(await screen.findByText(/Page connexion .*"stepExpired":true/)).toBeInTheDocument()
})

test('nobody logged in and no forced change: the page sends to the login page', async () => {
  anonymous()
  renderPage()
  expect(await screen.findByText(/Page connexion/)).toBeInTheDocument()
  expect(changePassword).not.toHaveBeenCalled()
})

// ---- Logged in: the own change is a page of the person's space (code owner's review on #11) ----

test('logged in: the public page sends to the password page of their space', async () => {
  loggedIn()
  const router = renderPage()
  expect(await screen.findByText('Page mot de passe de l’espace')).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/patient/mot-de-passe')
  expect(changePassword).not.toHaveBeenCalled()
})

test('logged in with the forced state too: still their space (a session needs no forced step)', async () => {
  loggedIn()
  const router = renderPage({ forced: true })
  expect(await screen.findByText('Page mot de passe de l’espace')).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/patient/mot-de-passe')
})

// ---- Answers of the forced step ----

test('400 PASSWORD_POLICY: the API message goes under the new password (it wins over the checklist)', async () => {
  anonymous()
  changePassword.mockRejectedValue(
    new ApiError(400, 'PASSWORD_POLICY', 'Ce mot de passe a déjà été utilisé récemment.', {
      password: 'Ce mot de passe a déjà été utilisé récemment.',
    }),
  )
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  await fill({ next: STRONG, confirm: STRONG })
  expect(await screen.findByText('Ce mot de passe a déjà été utilisé récemment.')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Nouveau mot de passe/)).toHaveAttribute('aria-invalid', 'true')
})

test('any other failure: a general message, the page stays', async () => {
  anonymous()
  changePassword.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur. Veuillez réessayer.'))
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  await fill({ next: STRONG, confirm: STRONG })
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre le serveur')
})

// ---- Checked before anything is sent ----

test('the two new passwords differ: said under the confirmation, nothing sent', async () => {
  anonymous()
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  await fill({ next: STRONG, confirm: `${STRONG}x` })
  expect(await screen.findByText('Les deux mots de passe ne sont pas identiques.')).toBeInTheDocument()
  expect(changePassword).not.toHaveBeenCalled()
})

test('a password that misses a rule is not sent, and the checklist shows which rule', async () => {
  anonymous()
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  await fill({ next: 'court', confirm: 'court' })
  expect(await screen.findByText('Le mot de passe ne respecte pas toutes les règles.')).toBeInTheDocument()
  expect(screen.getByText('12 caractères ou plus').closest('li')).toHaveAttribute('data-ok', 'false')
  expect(screen.getByText('Une minuscule').closest('li')).toHaveAttribute('data-ok', 'true')
  expect(changePassword).not.toHaveBeenCalled()
})

test('forced: no e-mail is known, so that rule is left to the server', async () => {
  anonymous()
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  expect(screen.queryByText('Différent de l’adresse e-mail')).toBeNull()
})
