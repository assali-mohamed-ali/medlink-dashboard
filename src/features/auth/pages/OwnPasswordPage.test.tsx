import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import AuthProvider from '../AuthProvider'
import { RequireAuth } from '../guards'
import { useAuth } from '../useAuth'
import * as api from '../api'
import OwnPasswordPage from './OwnPasswordPage'

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
  const state = useLocation().state as Record<string, unknown> | null
  const { status } = useAuth()
  return (
    <>
      <p>Page connexion {JSON.stringify(state ?? {})}</p>
      <p data-testid="session">{status}</p>
    </>
  )
}

/** The page as a space mounts it: behind the space's guard (the real one), which sends to the login page. */
function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/patient',
        element: <RequireAuth role="PATIENT" />,
        children: [{ path: '/patient/mot-de-passe', element: <OwnPasswordPage /> }],
      },
      { path: '/connexion', element: <LoginStub /> },
    ],
    { initialEntries: ['/patient/mot-de-passe'] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

async function fill(fields: { current: string; next: string; confirm: string }) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Mot de passe actuel/), fields.current)
  await user.type(screen.getByLabelText(/^Nouveau mot de passe/), fields.next)
  await user.type(screen.getByLabelText(/^Confirmez le nouveau mot de passe/), fields.confirm)
  await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.fetchMe).mockResolvedValue({ user: patient })
})

test('asks the current password too, and warns that every device logs out', async () => {
  renderPage()
  expect(await screen.findByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
  expect(screen.getByLabelText(/^Mot de passe actuel/)).toHaveAttribute('autocomplete', 'current-password')
  expect(screen.getByText(/déconnecté de tous vos appareils/)).toBeInTheDocument()
})

test('a page of the space: no public header, no "back to my space" link (the menu is there)', async () => {
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  expect(screen.queryByRole('banner')).toBeNull()
  expect(screen.queryByRole('link', { name: 'Retour à mon espace' })).toBeNull()
})

test('204 sends both passwords, ends the session here too, and the guard opens the login page with the reason', async () => {
  changePassword.mockResolvedValue(undefined)
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  await fill({ current: 'Ancien-Mot-2025!', next: STRONG, confirm: STRONG })
  expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'Ancien-Mot-2025!', newPassword: STRONG })
  // passwordChanged only: no "session expired" notice, and no page to come back to after the next login
  expect(await screen.findByText('Page connexion {"passwordChanged":true}')).toBeInTheDocument()
  expect(screen.getByTestId('session')).toHaveTextContent('anonymous')
  expect(api.logout).not.toHaveBeenCalled()
})

test('401 INVALID_CURRENT_PASSWORD shows the message under the current password and stays', async () => {
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

test('400 VALIDATION_FAILED: each field message under its field', async () => {
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

test('400 PASSWORD_POLICY: the API message goes under the new password (it wins over the checklist)', async () => {
  changePassword.mockRejectedValue(
    new ApiError(400, 'PASSWORD_POLICY', 'Ce mot de passe a déjà été utilisé récemment.', {
      password: 'Ce mot de passe a déjà été utilisé récemment.',
    }),
  )
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  await fill({ current: 'Ancien-Mot-2025!', next: STRONG, confirm: STRONG })
  expect(await screen.findByText('Ce mot de passe a déjà été utilisé récemment.')).toBeInTheDocument()
  expect(screen.getByLabelText(/^Nouveau mot de passe/)).toHaveAttribute('aria-invalid', 'true')
})

test('a missing current password is said under its field, nothing sent', async () => {
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Nouveau mot de passe/), STRONG)
  await user.type(screen.getByLabelText(/^Confirmez le nouveau mot de passe/), STRONG)
  await user.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
  expect(await screen.findByText('Saisissez votre mot de passe actuel.')).toBeInTheDocument()
  expect(changePassword).not.toHaveBeenCalled()
})

test('the "not your e-mail" rule is checked against the account e-mail', async () => {
  renderPage()
  await screen.findByRole('heading', { name: 'Changer mon mot de passe' })
  expect(screen.getByText('Différent de l’adresse e-mail')).toBeInTheDocument()
})
