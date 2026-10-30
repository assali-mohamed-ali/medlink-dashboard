import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import Card from './Card'

test('a card with a title is a region named by its heading, with its action and footer', () => {
  render(
    <Card title="Prochain rendez-vous" action={<button type="button">Déplacer</button>} footer="Modifiable 24 h avant.">
      Jeudi 14 novembre à 09:30
    </Card>,
  )
  const card = screen.getByRole('region', { name: 'Prochain rendez-vous' })
  expect(within(card).getByRole('heading', { level: 2, name: 'Prochain rendez-vous' })).toBeInTheDocument()
  expect(within(card).getByRole('button', { name: 'Déplacer' })).toBeInTheDocument()
  expect(card).toHaveTextContent('Jeudi 14 novembre à 09:30')
  expect(card).toHaveTextContent('Modifiable 24 h avant.')
})

test('the heading level follows the page outline', () => {
  render(<Card title="Documents" headingLevel={3}>…</Card>)
  expect(screen.getByRole('heading', { level: 3, name: 'Documents' })).toBeInTheDocument()
})

test('without a title it is a plain box, not a landmark', () => {
  render(<Card>Contenu</Card>)
  expect(screen.queryByRole('region')).toBeNull()
  expect(screen.getByText('Contenu')).toBeInTheDocument()
})
