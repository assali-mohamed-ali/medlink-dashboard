import { render, screen } from '@testing-library/react'
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

// The labels end with a "*" for required fields: match them by their start.
const passwordField = () => screen.getByLabelText(/^Mot de passe maître/)
const submitButton = () => screen.getByRole('button', { name: /^Créer mon compte/ })

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Prénom/), 'Amel')
  await user.type(screen.getByLabelText(/^Nom de famille/), 'Ben Salah')
  await user.type(screen.getByLabelText(/^Adresse e-mail/), 'amel@example.com')
  await user.type(passwordField(), 'Secret-12345!')
  await user.type(screen.getByLabelText(/^Date de naissance/), '1990-05-12')
  await user.type(screen.getByLabelText(/^Téléphone/), '+216 71 000 000')
  await user.type(screen.getByLabelText(/^Adresse de résidence/), '12 rue de la Santé, Tunis')
  await user.selectOptions(screen.getByLabelText(/^Gouvernorat/), 'tunis')
  await user.click(screen.getAllByRole('radio')[0])
  await user.click(screen.getByRole('checkbox', { name: /accepte expressément/ }))
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

  await user.type(passwordField(), 'abcdefghijkl')
  expect(screen.getByTestId('rule-length')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-lowercase')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-uppercase')).not.toHaveClass('signup__rule--ok')

  await user.clear(passwordField())
  await user.type(passwordField(), 'Abcdefghij1!')
  expect(screen.getByTestId('rule-length')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-uppercase')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-lowercase')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-digit')).toHaveClass('signup__rule--ok')
  expect(screen.getByTestId('rule-special')).toHaveClass('signup__rule--ok')
})

test('keeps the submit button disabled while a password rule fails', async () => {
  const user = userEvent.setup()
  renderPage()

  const button = submitButton()
  expect(button).toBeDisabled()

  await user.type(passwordField(), 'short')
  expect(button).toBeDisabled()

  await user.clear(passwordField())
  await user.type(screen.getByLabelText(/^Adresse e-mail/), 'amel@example.com')
  await user.type(passwordField(), 'Secret-12345!')
  expect(button).not.toBeDisabled()
})

test('shows the verify-email screen on 201', async () => {
  register.mockResolvedValue({ message: 'Vérifiez votre boîte mail' })
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(submitButton())

  expect(register).toHaveBeenCalledWith({
    email: 'amel@example.com',
    password: 'Secret-12345!',
    firstName: 'Amel',
    lastName: 'Ben Salah',
    birthDate: '1990-05-12',
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
    new ApiError(400, 'VALIDATION_FAILED', 'Données invalides.', {
      email: 'Cette adresse e-mail est invalide.',
      phone: 'Numéro de téléphone incorrect.',
    }),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(submitButton())

  expect(await screen.findByText('Cette adresse e-mail est invalide.')).toBeInTheDocument()
  expect(screen.getByText('Numéro de téléphone incorrect.')).toBeInTheDocument()
})

test('the confirmation never says whether the account already existed', async () => {
  register.mockResolvedValue({
    message: 'Vérifiez votre boîte mail pour activer votre compte.',
  })
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(submitButton())

  await screen.findByRole('heading', { name: 'Vérifiez votre boîte mail' })
  expect(screen.queryByText(/existe déjà/i)).toBeNull()
  expect(screen.queryByText(/compte (a été )?créé/i)).toBeNull()
})

test('shows the password policy message under the password field', async () => {
  register.mockRejectedValue(
    new ApiError(
      400,
      'PASSWORD_POLICY',
      'Le mot de passe ne respecte pas la politique de sécurité.',
    ),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(submitButton())

  expect(
    await screen.findByText('Le mot de passe ne respecte pas la politique de sécurité.'),
  ).toBeInTheDocument()
})

test('shows the message in a banner when a 400 has no field details', async () => {
  register.mockRejectedValue(
    new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.'),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(submitButton())

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Certains champs sont invalides.',
  )
})

test('shows the API message when the service is unavailable', async () => {
  register.mockRejectedValue(
    new ApiError(503, 'IDENTITY_UNAVAILABLE', 'Service momentanément indisponible.'),
  )
  const user = userEvent.setup()
  renderPage()

  await fillValidForm(user)
  await user.click(submitButton())

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Service momentanément indisponible.',
  )
})
