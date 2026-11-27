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
  await user.type(await screen.findByLabelText('Code de confirmation'), code)
  await user.click(screen.getByRole('button', { name: 'Confirmer le changement' }))
  expect(api.confirmEmailChange).toHaveBeenCalledWith(code)
  expect(await screen.findByText(/Confirmation enregistrée/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Se reconnecter' }))
  expect(onConfirmed).toHaveBeenCalledOnce()
})
