import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '../../services/apiClient'
import * as authService from './authService'
import SignupPage from './SignupPage'

vi.mock('./authService', () => ({
  fetchCsrf: vi.fn(),
  register: vi.fn(),
}))

const fetchCsrf = vi.mocked(authService.fetchCsrf)
const register = vi.mocked(authService.register)

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/inscription']}>
      <Routes>
        <Route path="/inscription" element={<SignupPage />} />
        <Route path="/connexion" element={<p>Page connexion</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Prénom'), 'Amel')
  await user.type(screen.getByLabelText('Nom'), 'Ben Salah')
  await user.type(screen.getByLabelText('Adresse e-mail'), 'amel@example.com')
  await user.type(screen.getByLabelText('Mot de passe'), 'Secret-12345!')
  await user.type(screen.getByLabelText('Date de naissance'), '1990-05-12')
  await user.type(screen.getByLabelText('Téléphone'), '+216 71 000 000')
  await user.type(screen.getByLabelText('Adresse'), '12 rue de la Santé, Tunis')
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchCsrf.mockResolvedValue(undefined)
})

test('asks for the CSRF cookie when the page opens', () => {
  renderPage()
  expect(fetchCsrf).toHaveBeenCalledTimes(1)
})

test('updates the password checklist as the user types', async () => {
  const user = userEvent.setup()
  renderPage()

  const lengthRule = screen.getByTestId('rule-length')
  expect(lengthRule).not.toHaveClass('signup__rule--ok')

  await user.type(screen.getByLabelText('Mot de passe'), 'abcdefghijkl')
  expect(screen.getByTestId('rule-length')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-lowercase')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-uppercase')).not.toHaveClass('signup__rule--ok')

  await user.clear(screen.getByLabelText('Mot de passe'))
  await user.type(screen.getByLabelText('Mot de passe'), 'Abcdefghij1!')
  expect(screen.getByTestId('rule-length')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-uppercase')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-lowercase')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-digit')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-special')).toHaveClass('signup__rule--ok')
})

test('keeps the submit button disabled while a password rule fails', async () => {
  const user = userEvent.setup()
  renderPage()

  const button = screen.getByRole('button', { name: 'Créer mon compte' })
  expect(button).toBeDisabled()

  await user.type(screen.getByLabelText('Mot de passe'), 'short')
  expect(button).toBeDisabled()

  await user.clear(screen.getByLabelText('Mot de passe'))
  await user.type(screen.getByLabelText('Adresse e-mail'), 'amel@example.com')
  await user.type(screen.getByLabelText('Mot de passe'), 'Secret-12345!')
  expect(button).not.toBeDisabled()
})

test('shows the verify-email screen on 201', async () => {
  register.mockResolvedValue({ message: 'Vérifiez votre boîte mail' })
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

  expect(register).toHaveBeenCalledWith({
    email: 'amel@example.com',
    password: 'Secret-12345!',
    firstName: 'Amel',
    lastName: 'Ben Salah',
    dateOfBirth: '1990-05-12',
    phone: '+216 71 000 000',
    address: '12 rue de la Santé, Tunis',
  })

  expect(
    await screen.findByRole('heading', { name: 'Vérifiez votre boîte mail' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/amel@example.com/)).toBeInTheDocument()
})

test('shows server field errors on 400', async () => {
  register.mockRejectedValue(
    new ApiError(400, 'VALIDATION_ERROR', 'Données invalides.', {
      email: 'Cette adresse e-mail est invalide.',
      phone: 'Numéro de téléphone incorrect.',
    }),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

  expect(await screen.findByText('Cette adresse e-mail est invalide.')).toBeInTheDocument()
  expect(screen.getByText('Numéro de téléphone incorrect.')).toBeInTheDocument()
})

test('shows the existing-account message on 409 with a login link', async () => {
  register.mockRejectedValue(
    new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Un compte existe déjà avec cet e-mail'),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Un compte existe déjà avec cet e-mail')
  expect(within(alert).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
    'href',
    '/connexion',
  )
})
