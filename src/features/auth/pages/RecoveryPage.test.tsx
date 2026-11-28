import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { paths } from '@/shared/config/paths'
import { requestPasswordReset, resetPassword } from '../api'
import RecoveryPage from './RecoveryPage'

vi.mock('../api', () => ({ requestPasswordReset: vi.fn(), resetPassword: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

test('requests a recovery link and shows a generic acknowledgement', async () => {
  render(<MemoryRouter initialEntries={[paths.forgotPassword]}><RecoveryPage /></MemoryRouter>)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Adresse e-mail'), 'patient@example.test')
  await user.click(screen.getByRole('button', { name: 'Demander un lien' }))

  expect(requestPasswordReset).toHaveBeenCalledWith('patient@example.test')
  expect(await screen.findByRole('status')).toHaveTextContent('Si un compte éligible')
})

test('validates password confirmation and sends the token from the recovery link', async () => {
  render(<MemoryRouter initialEntries={[`${paths.resetPassword}?token=example-token`]}><RecoveryPage /></MemoryRouter>)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'Fiction-Test-321!')
  const confirmation = screen.getByLabelText('Confirmer le mot de passe')
  await user.type(confirmation, 'Wrong-Confirmation-123!')
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('à l’identique')
  expect(resetPassword).not.toHaveBeenCalled()

  await user.clear(confirmation)
  await user.type(confirmation, 'Fiction-Test-321!')
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }))
  expect(resetPassword).toHaveBeenCalledWith('example-token', 'Fiction-Test-321!')
  expect(await screen.findByRole('status')).toHaveTextContent('Votre mot de passe a été modifié.')
})
