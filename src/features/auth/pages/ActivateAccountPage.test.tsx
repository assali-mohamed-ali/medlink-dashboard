import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as authApi from '../api'
import ActivateAccountPage from './ActivateAccountPage'

// MLink-20 (20.3, front): /activer-compte, the page the activation mail opens (API MLink-71, endpoints 14 and 15). A new
// staff member chooses their first password with the mailed token; a bad or old link offers a new one. API mocked.
vi.mock('../api', () => ({ activateAccount: vi.fn(), resendActivation: vi.fn() }))
const activateAccount = vi.mocked(authApi.activateAccount)
const resendActivation = vi.mocked(authApi.resendActivation)

const PASSWORD = 'Activation-2026!x'

function renderPage(url: string) {
  const router = createMemoryRouter(
    [
      { path: '/activer-compte', element: <ActivateAccountPage /> },
      { path: '/connexion', element: <p>Page connexion</p> },
    ],
    { initialEntries: [url] },
  )
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return router
}

async function choosePassword(password: string, confirmation = password) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Mot de passe'), password)
  await user.type(screen.getByLabelText('Confirmez le mot de passe'), confirmation)
  await user.click(screen.getByRole('button', { name: 'Activer mon compte' }))
  return user
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('the mailed token leaves the address bar; the page asks for a password only, never an e-mail', async () => {
  const router = renderPage('/activer-compte?token=mail-token-1')

  expect(await screen.findByRole('heading', { level: 1, name: 'Activez votre compte' })).toBeInTheDocument()
  expect(router.state.location.search).toBe('')
  expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('autocomplete', 'new-password')
  expect(screen.queryByLabelText('Adresse e-mail')).toBeNull()
  // The rules are shown before anything is typed
  expect(screen.getByText('12 caractères ou plus')).toBeInTheDocument()
  expect(activateAccount).not.toHaveBeenCalled()
})

test('a valid password activates the account once (204), then "Se connecter" leads to the login page', async () => {
  activateAccount.mockResolvedValue(undefined)
  renderPage('/activer-compte?token=mail-token-1')

  await choosePassword(PASSWORD)

  expect(await screen.findByText('Votre compte est activé.')).toBeInTheDocument()
  expect(activateAccount).toHaveBeenCalledExactlyOnceWith('mail-token-1', PASSWORD)
  expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')
  expect(screen.queryByLabelText('Mot de passe')).toBeNull()
})

test.each([
  ['a password that breaks the rules', 'court', 'court', 'Le mot de passe ne respecte pas toutes les règles.'],
  ['two different passwords', PASSWORD, `${PASSWORD}?`, 'Les deux mots de passe ne sont pas identiques.'],
])('%s is refused on the page, before any request', async (_, password, confirmation, message) => {
  renderPage('/activer-compte?token=mail-token-1')

  await choosePassword(password, confirmation)

  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(activateAccount).not.toHaveBeenCalled()
})

test('400 PASSWORD_POLICY: Keycloak’s rule, in French, under the password field; what was typed stays', async () => {
  activateAccount.mockRejectedValue(
    new ApiError(400, 'PASSWORD_POLICY', 'Le mot de passe a déjà été utilisé.', {
      password: 'Ce mot de passe a déjà été utilisé récemment.',
    }),
  )
  renderPage('/activer-compte?token=mail-token-1')

  await choosePassword(PASSWORD)

  expect(await screen.findByText('Ce mot de passe a déjà été utilisé récemment.')).toBeInTheDocument()
  expect(screen.getByLabelText('Mot de passe')).toHaveValue(PASSWORD)
  expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('aria-invalid', 'true')
})

test.each([
  ['410 TOKEN_EXPIRED', new ApiError(410, 'TOKEN_EXPIRED', 'Ce lien a expiré ou a déjà été utilisé.'), 'Ce lien a expiré ou a déjà servi.'],
  ['400 INVALID_TOKEN', new ApiError(400, 'INVALID_TOKEN', 'Ce lien n’est pas valide.'), 'Ce lien n\'est pas valide.'],
])('%s: the link is over, the form gives way to "Recevoir un nouveau lien"', async (_, error, message) => {
  activateAccount.mockRejectedValue(error)
  renderPage('/activer-compte?token=old-token')

  await choosePassword(PASSWORD)

  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(screen.queryByLabelText('Mot de passe')).toBeNull()
  expect(screen.getByRole('button', { name: 'Recevoir un nouveau lien' })).toBeInTheDocument()
})

test('no token in the link: says so and offers a new link, no password field', async () => {
  renderPage('/activer-compte')

  expect(await screen.findByText('Ouvrez le lien reçu par e-mail pour activer votre compte.')).toBeInTheDocument()
  expect(screen.queryByLabelText('Mot de passe')).toBeNull()
  expect(screen.getByRole('button', { name: 'Recevoir un nouveau lien' })).toBeInTheDocument()
})

test('"Recevoir un nouveau lien" sends the e-mail (202) and shows the API’s neutral answer', async () => {
  resendActivation.mockResolvedValue({
    message: "Si un compte en attente d'activation existe pour cet e-mail, un nouveau lien a été envoyé.",
  })
  const user = userEvent.setup()
  renderPage('/activer-compte')

  await user.type(await screen.findByLabelText('Adresse e-mail'), 'lina@medlink.local')
  await user.click(screen.getByRole('button', { name: 'Recevoir un nouveau lien' }))

  expect(resendActivation).toHaveBeenCalledExactlyOnceWith('lina@medlink.local')
  expect(
    await screen.findByText("Si un compte en attente d'activation existe pour cet e-mail, un nouveau lien a été envoyé."),
  ).toBeInTheDocument()
})

test('a refused new link (e.g. 429) is shown as an error', async () => {
  resendActivation.mockRejectedValue(
    new ApiError(429, 'TOO_MANY_REQUESTS', 'Trop de demandes depuis votre connexion. Réessayez dans quelques minutes.'),
  )
  const user = userEvent.setup()
  renderPage('/activer-compte')

  await user.type(await screen.findByLabelText('Adresse e-mail'), 'lina@medlink.local')
  await user.click(screen.getByRole('button', { name: 'Recevoir un nouveau lien' }))

  expect(await screen.findByText('Trop de demandes depuis votre connexion. Réessayez dans quelques minutes.')).toBeInTheDocument()
})
