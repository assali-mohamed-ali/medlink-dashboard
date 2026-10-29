import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import { ApiError } from '@/shared/api/apiClient'
import * as mfaApi from '../api'
import ConfigureCodePage from './ConfigureCodePage'

vi.mock('../api', () => ({ setupMfa: vi.fn(), verifyMfa: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
const setupMfa = vi.mocked(mfaApi.setupMfa)
const verifyMfa = vi.mocked(mfaApi.verifyMfa)

const SETUP = {
  otpauthUrl: 'otpauth://totp/MedLink:dr@example.com?secret=JBSWY3DPEHPK3PXP',
  qrCode: 'data:image/png;base64,iVBORw0KGgo=',
  secret: 'JBSWY3DPEHPK3PXP',
}

function LoginStub() {
  const state = useLocation().state as { setupToken?: string } | null
  return <p>Page connexion{state?.setupToken ? ` (jeton ${state.setupToken})` : ''}</p>
}

function renderPage(url: string) {
  const router = createMemoryRouter(
    [
      { path: '/configurer-code', element: <ConfigureCodePage /> },
      { path: '/double-authentification', element: <p>Page code</p> },
      { path: '/connexion', element: <LoginStub /> },
      { path: '/admin', element: <p>Espace administratif</p> },
    ],
    { initialEntries: [url] },
  )
  // StrictMode runs effects twice in development: the page must still set up only once
  render(
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>,
  )
  return router
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authApi.fetchMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
})

test('sets up once with the mailed token, then removes the token from the address bar', async () => {
  setupMfa.mockResolvedValue(SETUP)
  const router = renderPage('/configurer-code?token=mail-token-123')
  expect(await screen.findByRole('img', { name: /QR code/ })).toHaveAttribute('src', SETUP.qrCode)
  expect(setupMfa).toHaveBeenCalledTimes(1)
  expect(setupMfa).toHaveBeenCalledWith('mail-token-123')
  expect(router.state.location.search).toBe('')
  expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
})

test('after scanning, the first good code opens the session', async () => {
  setupMfa.mockResolvedValue(SETUP)
  verifyMfa.mockResolvedValue({
    user: { id: 's1', email: 'staff@example.com', firstName: 'Nour', lastName: 'K', roles: ['ADMINISTRATIVE_STAFF'] },
  })
  const router = renderPage('/configurer-code?token=mail-token-123')
  await userEvent.type(await screen.findByLabelText('Code à 6 chiffres'), '654321')
  await userEvent.click(screen.getByRole('button', { name: /Valider/ }))
  expect(verifyMfa).toHaveBeenCalledWith('654321')
  expect(await screen.findByText('Espace administratif')).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/admin')
})

test('without a token: says to open the link from the mail, calls nothing', () => {
  renderPage('/configurer-code')
  expect(screen.getByRole('alert')).toHaveTextContent('Ouvrez le lien reçu par e-mail')
  expect(setupMfa).not.toHaveBeenCalled()
})

test.each([
  [new ApiError(400, 'INVALID_TOKEN', 'Lien invalide.'), "Ce lien n'est pas valide."],
  [new ApiError(410, 'TOKEN_EXPIRED', 'Lien expiré.'), 'Ce lien a expiré ou a déjà servi.'],
])('a bad link (%s): explains and offers to log in again', async (error, text) => {
  setupMfa.mockRejectedValue(error)
  renderPage('/configurer-code?token=old')
  expect(await screen.findByRole('alert')).toHaveTextContent(text)
  expect(screen.getByRole('link', { name: 'Se reconnecter' })).toHaveAttribute('href', '/connexion')
  expect(screen.queryByRole('img', { name: /QR code/ })).toBeNull()
})

test('already configured: goes on to the code', async () => {
  setupMfa.mockRejectedValue(new ApiError(409, 'MFA_ALREADY_ENROLLED', 'Déjà configuré.'))
  renderPage('/configurer-code?token=t')
  expect(await screen.findByRole('status')).toHaveTextContent('déjà configurée')
  expect(screen.getByRole('link', { name: 'Saisir mon code' })).toHaveAttribute('href', '/double-authentification')
})

test('the 5-minute code step is over: log in again, keeping the token in memory (not in the URL)', async () => {
  setupMfa.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Aucune connexion en attente.'))
  const router = renderPage('/configurer-code?token=keep-me')
  expect(await screen.findByText('Page connexion (jeton keep-me)')).toBeInTheDocument()
  expect(router.state.location.search).toBe('')
})

test('the token may also come from the app (after logging in again)', async () => {
  setupMfa.mockResolvedValue(SETUP)
  const router = createMemoryRouter([{ path: '/configurer-code', element: <ConfigureCodePage /> }], {
    initialEntries: [{ pathname: '/configurer-code', state: { setupToken: 'from-login' } }],
  })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  await screen.findByRole('img', { name: /QR code/ })
  expect(setupMfa).toHaveBeenCalledWith('from-login')
})

test('never shows something that is not a QR image', async () => {
  setupMfa.mockResolvedValue({ ...SETUP, qrCode: 'https://evil.example/track.png' })
  renderPage('/configurer-code?token=t')
  expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
  expect(screen.queryByRole('img', { name: /QR code/ })).toBeNull()
})
