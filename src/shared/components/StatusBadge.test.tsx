import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import StatusBadge from './StatusBadge'
import UserAvatar from './UserAvatar'

test('a status says it in words, with an icon hidden from screen readers (never colour alone)', () => {
  const { container } = render(
    <>
      <StatusBadge tone="success">Confirmé</StatusBadge>
      <StatusBadge tone="warning">En attente</StatusBadge>
      <StatusBadge tone="danger">Annulé</StatusBadge>
      <StatusBadge tone="info">Nouveau</StatusBadge>
      <StatusBadge>Brouillon</StatusBadge>
    </>,
  )
  for (const word of ['Confirmé', 'En attente', 'Annulé', 'Nouveau', 'Brouillon']) {
    expect(screen.getByText(word)).toBeInTheDocument()
  }
  const icons = container.querySelectorAll('svg')
  expect(icons).toHaveLength(5)
  icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'))
})

test('the avatar shows the initials of the first and last name, decorative next to the name', () => {
  const { container } = render(<UserAvatar firstName="amel" lastName="Ben Salah" />)
  expect(container).toHaveTextContent('AB')
  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
})

test('alone, the avatar is an image named after the person', () => {
  render(<UserAvatar firstName="Amel" lastName="Ben Salah" alone />)
  expect(screen.getByRole('img', { name: 'Amel Ben Salah' })).toHaveTextContent('AB')
})
