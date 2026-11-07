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
