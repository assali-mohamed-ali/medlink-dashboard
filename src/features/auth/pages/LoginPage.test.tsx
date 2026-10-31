import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import AuthProvider from '../AuthProvider'
import * as authService from '../api'
import LoginPage from './LoginPage'

vi.mock('../api', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  resendVerification: vi.fn(),
}))

const fetchMe = vi.mocked(authService.fetchMe)
const login = vi.mocked(authService.login)
const resendVerification = vi.mocked(authService.resendVerification)

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/connexion']}>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/patient" element={<p>Espace patient</p>} />
          <Route path="/praticien" element={<p>Espace praticien</p>} />
          <Route path="/admin" element={<p>Espace administratif</p>} />
          <Route path="/double-authentification" element={<p>Page MFA</p>} />
          <Route path="/mot-de-passe" element={<p>Page mot de passe</p>} />
          <Route path="/inscription" element={<p>Page inscription</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function fillAndSubmit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Adresse e-mail'), 'amel@example.com')
  await user.type(screen.getByLabelText('Mot de passe'), 'Secret-12345!')
  await user.click(screen.getByRole('button', { name: /Se connecter/ }))
}

function userWithRole(role: 'PATIENT' | 'PRACTITIONER' | 'ADMINISTRATIVE_STAFF') {
  return {
    id: 'a1b2',
    email: 'amel@example.com',
    firstName: 'Amel',
    lastName: 'Test',
    roles: [role],
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
})

test('shows the sign-up link', () => {
  renderPage()
  // The public header has its own "Créer un compte" link: check the one in the page
  const page = within(screen.getByRole('main'))
  expect(page.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
    'href',
    '/inscription',
  )
})

test('asks for both fields before calling the API', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(screen.getByRole('button', { name: /Se connecter/ }))
  expect(await screen.findByText('Saisissez votre adresse e-mail.')).toBeInTheDocument()
  expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument()
  expect(login).not.toHaveBeenCalled()
})

test.each([
  ['PATIENT', 'Espace patient'],
  ['PRACTITIONER', 'Espace praticien'],
  ['ADMINISTRATIVE_STAFF', 'Espace administratif'],
] as const)('a %s goes to their own space', async (role, expected) => {
  login.mockResolvedValue({ user: userWithRole(role) })
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByText(expected)).toBeInTheDocument()
  expect(login).toHaveBeenCalledWith('amel@example.com', 'Secret-12345!')
})

test('goes to the MFA page when a code is required', async () => {
  login.mockResolvedValue({ mfaRequired: true, mfaSetupRequired: true })
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByText('Page MFA')).toBeInTheDocument()
})

test('goes to the forced password change page', async () => {
  login.mockResolvedValue({ passwordChangeRequired: true })
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByText('Page mot de passe')).toBeInTheDocument()
})

test('shows the API message on a 401 and clears the password', async () => {
  login.mockRejectedValue(
    new ApiError(
      401,
      'INVALID_CREDENTIALS',
      'E-mail ou mot de passe incorrect, ou compte temporairement verrouillé.',
    ),
  )
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'E-mail ou mot de passe incorrect',
  )
  expect(screen.getByLabelText('Mot de passe')).toHaveValue('')
})

test('hides the password again after a failed login', async () => {
  login.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou mot de passe incorrect.'))
  const user = userEvent.setup()
  renderPage()
  await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
  expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'text')

  await fillAndSubmit()

  await screen.findByRole('alert')
  expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password')
})

test('offers to resend the link when the e-mail is not verified', async () => {
  login.mockRejectedValue(
    new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Votre adresse e-mail n’est pas vérifiée.'),
  )
  resendVerification.mockResolvedValue({
    message: 'Si le compte existe, un lien a été envoyé.',
  })
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByRole('alert')).toHaveTextContent('pas vérifiée')

  await userEvent.click(screen.getByRole('button', { name: 'Renvoyer le lien' }))
  expect(resendVerification).toHaveBeenCalledWith('amel@example.com')
  expect(await screen.findByRole('status')).toHaveTextContent('lien a été envoyé')
})

test('shows the API message for a disabled account', async () => {
  login.mockRejectedValue(
    new ApiError(403, 'ACCOUNT_DISABLED', 'Ce compte est désactivé.'),
  )
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByRole('alert')).toHaveTextContent('Ce compte est désactivé.')
  expect(screen.queryByRole('button', { name: 'Renvoyer le lien' })).toBeNull()
})

test('shows the API message when the service is unavailable', async () => {
  login.mockRejectedValue(
    new ApiError(503, 'IDENTITY_UNAVAILABLE', 'Service momentanément indisponible.'),
  )
  renderPage()
  await fillAndSubmit()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Service momentanément indisponible.',
  )
})

test('the eye button shows and hides the password', async () => {
  const user = userEvent.setup()
  renderPage()
  const field = screen.getByLabelText('Mot de passe')
  expect(field).toHaveAttribute('type', 'password')

  await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
  expect(field).toHaveAttribute('type', 'text')

  await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }))
  expect(field).toHaveAttribute('type', 'password')
})

test('says the session expired when the app sent the user here for that reason', async () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/connexion', state: { sessionExpired: true } }]}>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Votre session a expiré. Reconnectez-vous pour continuer.',
  )
})

test('says nothing about a session on a normal visit', () => {
  renderPage()
  expect(screen.queryByText(/session a expiré/)).toBeNull()
})

test('after an expired code step, the login page says why', async () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/connexion', state: { stepExpired: true } }]}>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Votre étape de connexion a expiré (5 minutes). Reconnectez-vous.',
  )
})

test('logging in again for a code setup link goes back to the setup, token in memory', async () => {
  login.mockResolvedValue({ mfaRequired: true, mfaSetupRequired: true })
  function SetupStub() {
    const state = useLocation().state as { setupToken?: string } | null
    return <p>Page configuration ({state?.setupToken})</p>
  }
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/connexion', state: { setupToken: 'tok-1' } }]}>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/configurer-code" element={<SetupStub />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  await fillAndSubmit()
  expect(await screen.findByText('Page configuration (tok-1)')).toBeInTheDocument()
})
