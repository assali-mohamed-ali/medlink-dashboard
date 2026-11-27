import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import PageLoader from './PageLoader'
import Spinner from './Spinner'

test('the spinner tells screen readers what is happening', () => {
  render(<Spinner label="Envoi du code…" />)
  expect(screen.getByRole('status')).toHaveTextContent('Envoi du code…')
})

test('the page loader says "Chargement…" by default', () => {
  render(<PageLoader />)
  expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
})
