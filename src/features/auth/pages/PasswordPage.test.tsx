import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import AuthProvider from '../AuthProvider'
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

// Shows why the app came to the login page, the way LoginPage reads it
function LoginStub() {
  const state = useLocation().state as Record<string, boolean> | null
  return <p>Page connexion {JSON.stringify(state ?? {})}</p>
}

function renderPage(state?: { forced?: boolean }) {
  const router = createMemoryRouter(
    [
      { path: '/mot-de-passe', element: <PasswordPage /> },
      { path: '/connexion', element: <LoginStub /> },
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

async function fill(fields: { current?: string; next: string; confirm: string }) {
  const user = userEvent.setup()
  if (fields.current !== undefined) await user.type(screen.getByLabelText(/^Mot de passe actuel/), fields.current)
  await user.type(screen.getByLabelText(/^Nouveau mot de passe/), fields.next)
  await user.type(screen.getByLabelText(/^Confirmez le nouveau mot de passe/), fields.confirm)
  await user.click(screen.getByRole('button', { name: /Changer le mot de passe|Enregistrer/ }))
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

// ---- Own change (logged in) ----

test('logged in: asks the current password too, and warns that every device logs out', async () => {
  loggedIn()
  renderPage()
  expect(await screen.findByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
  expect(screen.getByLabelText(/^Mot de passe actuel/)).toHaveAttribute('autocomplete', 'current-password')
  expect(screen.getByText(/déconnecté de tous vos appareils/)).toBeInTheDocument()
})

test('logged in: 204 sends both passwords, ends the session here too, and goes to the login page', async () => {
  loggedIn()
  changePassword.mockResolvedValue(undefined)
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  await fill({ current: 'Ancien-Mot-2025!', next: STRONG, confirm: STRONG })
  expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'Ancien-Mot-2025!', newPassword: STRONG })
  // passwordChanged, and no "session expired" notice: the person ended the session on purpose
  expect(await screen.findByText('Page connexion {"passwordChanged":true}')).toBeInTheDocument()
  expect(api.logout).not.toHaveBeenCalled()
})

test('logged in: 401 INVALID_CURRENT_PASSWORD shows the message under the current password and stays', async () => {
  loggedIn()
  changePassword.mockRejectedValue(
    new ApiError(401, 'INVALID_CURRENT_PASSWORD', 'Le mot de passe actuel est incorrect.'),
  )
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  await fill({ current: 'Faux-Mot-2025!', next: STRONG, confirm: STRONG })
  expect(await screen.findByText('Le mot de passe actuel est incorrect.')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Mot de passe actuel/)).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
})

test('logged in: 401 SESSION_EXPIRED (staff forced a reset meanwhile): login page with the expired notice', async () => {
  loggedIn()
  changePassword.mockRejectedValue(new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.'))
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  await fill({ current: 'Ancien-Mot-2025!', next: STRONG, confirm: STRONG })
  expect(await screen.findByText(/Page connexion .*"sessionExpired":true/)).toBeInTheDocument()
})

// ---- Answers common to both modes ----

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

test('400 VALIDATION_FAILED: each field message under its field', async () => {
  loggedIn()
  changePassword.mockRejectedValue(
    new ApiError(400, 'VALIDATION_FAILED', 'Le mot de passe actuel est obligatoire.', {
      currentPassword: 'Le mot de passe actuel est obligatoire.',
    }),
  )
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  await fill({ current: ' ', next: STRONG, confirm: STRONG })
  expect(await screen.findByText('Le mot de passe actuel est obligatoire.')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Mot de passe actuel/)).toHaveAttribute('aria-invalid', 'true')
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

test('logged in: the "not your e-mail" rule is checked against the account e-mail', async () => {
  loggedIn()
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  expect(screen.getByText('Différent de l’adresse e-mail')).toBeInTheDocument()
})

test('forced: no e-mail is known, so that rule is left to the server', async () => {
  anonymous()
  renderPage({ forced: true })
  await screen.findByRole('heading', { name: 'Choisissez un nouveau mot de passe' })
  expect(screen.queryByText('Différent de l’adresse e-mail')).toBeNull()
})
