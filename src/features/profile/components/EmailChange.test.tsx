import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import * as api from '../api'
import EmailChange from './EmailChange'

vi.mock('../api', () => ({ requestEmailChange: vi.fn(), confirmEmailChange: vi.fn() }))
beforeEach(() => vi.resetAllMocks())

test('requests mailbox verification then confirms without claiming an immediate identity update', async () => {
  const user = userEvent.setup()
  const onConfirmed = vi.fn().mockResolvedValue(undefined)
  vi.mocked(api.requestEmailChange).mockResolvedValue(undefined)
  vi.mocked(api.confirmEmailChange).mockResolvedValue({ status: 'ACCEPTED' })
  render(<EmailChange onConfirmed={onConfirmed} />)
  await user.type(screen.getByLabelText('Nouvelle adresse e-mail'), 'new@example.com')
  await user.type(screen.getByLabelText('Mot de passe actuel'), 'Current-password!')
  await user.click(screen.getByRole('button', { name: 'Envoyer le code' }))
  expect(api.requestEmailChange).toHaveBeenCalledWith('new@example.com', 'Current-password!')
  const code = 'a'.repeat(43)
  const confirmation = await screen.findByLabelText('Code de confirmation')
  expect(confirmation).toHaveValue('')
  expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
  await user.type(confirmation, code)
  await user.click(screen.getByRole('button', { name: 'Confirmer le changement' }))
  expect(api.confirmEmailChange).toHaveBeenCalledWith(code)
  expect(await screen.findByText(/Confirmation enregistrée/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Se reconnecter' }))
  expect(onConfirmed).toHaveBeenCalledOnce()
})

test('resumes confirmation after reconnecting without requesting a second code', async () => {
  const user = userEvent.setup()
  vi.mocked(api.confirmEmailChange).mockResolvedValue({ status: 'ACCEPTED' })
  render(<EmailChange onConfirmed={vi.fn().mockResolvedValue(undefined)} />)
  await user.click(screen.getByRole('button', { name: 'J’ai déjà un code' }))
  const code = 'b'.repeat(43)
  await user.type(screen.getByLabelText('Code de confirmation'), code)
  await user.click(screen.getByRole('button', { name: 'Confirmer le changement' }))
  expect(api.confirmEmailChange).toHaveBeenCalledWith(code)
  expect(api.requestEmailChange).not.toHaveBeenCalled()
})

test('switching between steps discards entered passwords and confirmation codes', async () => {
  const user = userEvent.setup()
  render(<EmailChange onConfirmed={vi.fn().mockResolvedValue(undefined)} />)
  await user.type(screen.getByLabelText('Mot de passe actuel'), 'Sensitive-password!')
  await user.click(screen.getByRole('button', { name: 'J’ai déjà un code' }))
  expect(screen.getByLabelText('Code de confirmation')).toHaveValue('')
  await user.type(screen.getByLabelText('Code de confirmation'), 'a'.repeat(43))
  await user.click(screen.getByRole('button', { name: 'Revenir' }))
  expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('')
  await user.click(screen.getByRole('button', { name: 'J’ai déjà un code' }))
  expect(screen.getByLabelText('Code de confirmation')).toHaveValue('')
  expect(api.confirmEmailChange).not.toHaveBeenCalled()
})
