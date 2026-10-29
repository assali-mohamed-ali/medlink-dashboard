import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import { ApiError } from '@/shared/api/apiClient'
import * as mfaApi from '../api'
import MfaPage from './MfaPage'

vi.mock('../api', () => ({ setupMfa: vi.fn(), verifyMfa: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
const verifyMfa = vi.mocked(mfaApi.verifyMfa)

function LoginStub() {
  const state = useLocation().state as { stepExpired?: boolean } | null
  return <p>Page connexion{state?.stepExpired ? ' (étape expirée)' : ''}</p>
}

function renderPage(state?: { mfaSetupRequired?: boolean }) {
  const router = createMemoryRouter(
    [
      { path: '/double-authentification', element: <MfaPage /> },
      { path: '/connexion', element: <LoginStub /> },
      { path: '/praticien', element: <p>Espace praticien</p> },
    ],
    { initialEntries: [{ pathname: '/double-authentification', state }] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

const codeField = () => screen.getByLabelText('Code à 6 chiffres')
const practitioner = {
  id: 'p1',
  email: 'dr@example.com',
  firstName: 'Sami',
  lastName: 'Ben Ali',
  roles: ['PRACTITIONER' as const],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authApi.fetchMe).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
})

test('first login: says to open the mailed link, asks no code yet', () => {
  renderPage({ mfaSetupRequired: true })
  expect(screen.getByRole('heading', { name: 'Configurez votre application' })).toBeInTheDocument()
  expect(screen.getByText(/lien envoyé à votre adresse e-mail/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Code à 6 chiffres')).toBeNull()
})

test('the code field suits a one-time code on every device', () => {
  renderPage({ mfaSetupRequired: false })
  expect(codeField()).toHaveAttribute('inputmode', 'numeric')
  expect(codeField()).toHaveAttribute('autocomplete', 'one-time-code')
  expect(codeField()).toHaveAttribute('maxlength', '6')
})

test('a good code opens the session and goes to the role space', async () => {
  verifyMfa.mockResolvedValue({ user: practitioner })
  const router = renderPage({ mfaSetupRequired: false })
  await userEvent.type(codeField(), '123456')
  await userEvent.click(screen.getByRole('button', { name: /Valider/ }))
  expect(verifyMfa).toHaveBeenCalledWith('123456')
  expect(await screen.findByText('Espace praticien')).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/praticien')
})

test('a code that is not 6 digits is refused before calling the API', async () => {
  renderPage({ mfaSetupRequired: false })
  await userEvent.type(codeField(), '12a4')
  await userEvent.click(screen.getByRole('button', { name: /Valider/ }))
  expect(await screen.findByText('Saisissez les 6 chiffres du code.')).toBeInTheDocument()
  expect(verifyMfa).not.toHaveBeenCalled()
})

test('a wrong code: says so, clears the field, stays on the page', async () => {
  verifyMfa.mockRejectedValue(new ApiError(401, 'INVALID_CODE', 'Code invalide.'))
  renderPage({ mfaSetupRequired: false })
  await userEvent.type(codeField(), '000000')
  await userEvent.click(screen.getByRole('button', { name: /Valider/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect')
  expect(codeField()).toHaveValue('')
})

test('5 wrong codes: the lock is explained and leads back to login', async () => {
  verifyMfa.mockRejectedValue(new ApiError(423, 'MFA_LOCKED', 'Trop de codes incorrects.'))
  renderPage({ mfaSetupRequired: false })
  await userEvent.type(codeField(), '000000')
  await userEvent.click(screen.getByRole('button', { name: /Valider/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent("Trop d'essais")
  expect(screen.getByRole('link', { name: 'Retour à la connexion' })).toHaveAttribute('href', '/connexion')
  expect(screen.queryByLabelText('Code à 6 chiffres')).toBeNull()
})

test('the 5-minute code step is over: back to login, which says why', async () => {
  verifyMfa.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Aucune connexion en attente.'))
  const router = renderPage({ mfaSetupRequired: false })
  await userEvent.type(codeField(), '123456')
  await userEvent.click(screen.getByRole('button', { name: /Valider/ }))
  expect(await screen.findByText('Page connexion (étape expirée)')).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/connexion')
})

test('opened directly (no login just before): asks for the code', () => {
  renderPage()
  expect(codeField()).toBeInTheDocument()
})
