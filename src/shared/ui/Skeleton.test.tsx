import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Skeleton from './Skeleton'

test('announces what is loading once; the grey blocks are hidden from screen readers', () => {
  const { container } = render(<Skeleton lines={3} label="Chargement des rendez-vous" />)
  expect(screen.getByRole('status')).toHaveTextContent('Chargement des rendez-vous')
  const blocks = container.querySelectorAll('[aria-hidden="true"] > *')
  expect(blocks).toHaveLength(3)
})

test('says "Chargement…" by default', () => {
  render(<Skeleton />)
  expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
})
