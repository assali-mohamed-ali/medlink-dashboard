import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Alert from './Alert'

test('an error interrupts the screen reader (role alert)', () => {
  render(<Alert tone="error">E-mail ou mot de passe incorrect.</Alert>)
  expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.')
})

test('information and success are polite (role status)', () => {
  render(
    <>
      <Alert tone="info">Un nouveau lien a été envoyé.</Alert>
      <Alert tone="success">Adresse confirmée.</Alert>
    </>,
  )
  expect(screen.getAllByRole('status')).toHaveLength(2)
  expect(screen.queryByRole('alert')).toBeNull()
})

test('a warning is polite too, and a title is read with its message', () => {
  render(
    <Alert tone="warning" title="Session bientôt expirée">
      Enregistrez votre saisie.
    </Alert>,
  )
  const alert = screen.getByRole('status')
  expect(alert).toHaveTextContent('Session bientôt expiréeEnregistrez votre saisie.')
  expect(screen.getByText('Session bientôt expirée').tagName).toBe('STRONG')
})

test('each tone has an icon, hidden from screen readers (the words carry the meaning)', () => {
  const { container } = render(
    <>
      <Alert tone="error">a</Alert>
      <Alert tone="warning">b</Alert>
      <Alert tone="success">c</Alert>
      <Alert tone="info">d</Alert>
    </>,
  )
  const icons = container.querySelectorAll('svg')
  expect(icons).toHaveLength(4)
  icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
})
