import { StrictMode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as authApi from '../api'
import VerifyEmailPage from './VerifyEmailPage'

vi.mock('../api', () => ({ verifyEmail: vi.fn(), resendVerification: vi.fn() }))
const verifyEmail = vi.mocked(authApi.verifyEmail)
const resendVerification = vi.mocked(authApi.resendVerification)

function renderPage(url: string) {
  const router = createMemoryRouter(
    [
      { path: '/verifier-email', element: <VerifyEmailPage /> },
      { path: '/connexion', element: <p>Page connexion</p> },
    ],
    { initialEntries: [url] },
  )
  // StrictMode runs effects twice: the link must still be used once (a second call would answer 410)
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
  return router
}

async function askForANewLink(email: string) {
  await userEvent.type(screen.getByLabelText('Adresse e-mail'), email)
  await userEvent.click(screen.getByRole('button', { name: /Recevoir un nouveau lien/ }))
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('confirms the address once with the mailed token, then removes the token from the URL', async () => {
  verifyEmail.mockResolvedValue(undefined)
  const router = renderPage('/verifier-email?token=mail-token-1')
  expect(await screen.findByText('Votre adresse e-mail est confirmée.')).toBeInTheDocument()
  expect(verifyEmail).toHaveBeenCalledTimes(1)
  expect(verifyEmail).toHaveBeenCalledWith('mail-token-1')
  expect(router.state.location.search).toBe('')
  expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')
})

test.each([
  [new ApiError(400, 'INVALID_TOKEN', 'Lien inconnu.'), "Ce lien n'est pas valide."],
  [new ApiError(410, 'TOKEN_EXPIRED', 'Lien expiré.'), 'Ce lien a expiré ou a déjà servi.'],
])('a bad link (%s): explains and offers a new link', async (error, text) => {
  verifyEmail.mockRejectedValue(error)
  renderPage('/verifier-email?token=old')
  expect(await screen.findByRole('alert')).toHaveTextContent(text)
  expect(screen.getByRole('button', { name: /Recevoir un nouveau lien/ })).toBeInTheDocument()
  // Already confirmed earlier? Logging in still works
  expect(screen.getByRole('link', { name: 'Se connecter' })).toBeInTheDocument()
})

test('a new link: the same neutral answer whatever the address', async () => {
  verifyEmail.mockRejectedValue(new ApiError(410, 'TOKEN_EXPIRED', 'Lien expiré.'))
  resendVerification.mockResolvedValue({
    message: 'Si un compte non vérifié existe pour cet e-mail, un nouveau lien a été envoyé.',
  })
  renderPage('/verifier-email?token=old')
  await screen.findByRole('alert')
  await askForANewLink('amel@example.com')
  expect(resendVerification).toHaveBeenCalledWith('amel@example.com')
  expect(await screen.findByText(/un nouveau lien a été envoyé/)).toBeInTheDocument()
})

test('a new link needs a valid address before calling the API', async () => {
  renderPage('/verifier-email')
  await askForANewLink('pas-une-adresse')
  expect(await screen.findByText('Saisissez une adresse e-mail valide.')).toBeInTheDocument()
  expect(resendVerification).not.toHaveBeenCalled()
})

test('without a token: says to open the mailed link, calls nothing, offers a new link', () => {
  renderPage('/verifier-email')
  expect(screen.getByRole('alert')).toHaveTextContent('Ouvrez le lien reçu par e-mail')
  expect(verifyEmail).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: /Recevoir un nouveau lien/ })).toBeInTheDocument()
})

test('while the API answers, a loader is shown', () => {
  verifyEmail.mockReturnValue(new Promise(() => {}))
  renderPage('/verifier-email?token=t')
  expect(screen.getByRole('status')).toHaveTextContent('Vérification de votre adresse…')
})
