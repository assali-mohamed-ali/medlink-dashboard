import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import PasswordField from './PasswordField'

test('hides the password until asked, then shows it', async () => {
  render(<PasswordField label="Mot de passe" />)
  const input = screen.getByLabelText('Mot de passe')
  expect(input).toHaveAttribute('type', 'password')

  await userEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
  expect(input).toHaveAttribute('type', 'text')
  const toggle = screen.getByRole('button', { name: 'Masquer le mot de passe' })
  expect(toggle).toHaveAttribute('aria-pressed', 'true')

  await userEvent.click(toggle)
  expect(input).toHaveAttribute('type', 'password')
})

test('the toggle is reachable with the keyboard right after the field', async () => {
  render(<PasswordField label="Mot de passe" />)
  await userEvent.tab()
  expect(screen.getByLabelText('Mot de passe')).toHaveFocus()
  await userEvent.tab()
  expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toHaveFocus()
})

test('the toggle never submits the form', () => {
  render(<PasswordField label="Mot de passe" />)
  expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toHaveAttribute('type', 'button')
})
