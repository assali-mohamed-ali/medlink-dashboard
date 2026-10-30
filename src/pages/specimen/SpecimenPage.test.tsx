import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, test } from 'vitest'
import SpecimenPage from './SpecimenPage'

function renderPage() {
  render(
    <MemoryRouter>
      <SpecimenPage />
    </MemoryRouter>,
  )
}

test('both type pairings are set side by side on the same MedLink text', () => {
  renderPage()
  const a = screen.getByRole('region', { name: /^Option A/ })
  const b = screen.getByRole('region', { name: /^Option B/ })
  expect(within(a).getByText('Plus Jakarta Sans + Instrument Serif')).toBeInTheDocument()
  expect(within(b).getByText('Geist + Instrument Serif')).toBeInTheDocument()
  expect(within(a).getByText(/Votre santé, entre de bonnes mains/)).toBeInTheDocument()
  expect(within(b).getByText(/Votre santé, entre de bonnes mains/)).toBeInTheDocument()
})

test('the toolbar switches the whole page between pairings A and B', async () => {
  const user = userEvent.setup()
  renderPage()
  const toolbar = screen.getByRole('toolbar', { name: 'Réglages du spécimen' })
  const optionA = within(toolbar).getByRole('button', { name: /^Option A/ })
  const optionB = within(toolbar).getByRole('button', { name: /^Option B/ })
  expect(optionA).toHaveAttribute('aria-pressed', 'true')
  expect(optionB).toHaveAttribute('aria-pressed', 'false')

  await user.click(optionB)
  expect(optionB).toHaveAttribute('aria-pressed', 'true')
  expect(optionA).toHaveAttribute('aria-pressed', 'false')
})

test('the greys switch between today and the proposal, with their contrast checks', async () => {
  const user = userEvent.setup()
  renderPage()
  const toolbar = screen.getByRole('toolbar', { name: 'Réglages du spécimen' })
  const proposed = within(toolbar).getByRole('button', { name: 'Gris proposés' })
  const current = within(toolbar).getByRole('button', { name: 'Gris actuels' })
  const checks = screen.getByRole('table', { name: /Contrastes/ })
  expect(proposed).toHaveAttribute('aria-pressed', 'true')
  expect(within(checks).queryAllByText('Insuffisant')).toHaveLength(0)

  await user.click(current)
  expect(current).toHaveAttribute('aria-pressed', 'true')
  expect(within(checks).getAllByText('Insuffisant').length).toBeGreaterThan(0)
})

test('it shows the screens the choice is for: a hero, the login card and a space page', () => {
  renderPage()
  expect(screen.getByRole('region', { name: 'Page publique' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Carte de connexion' })).toBeInTheDocument()
  const space = screen.getByRole('region', { name: 'Page d’un espace' })
  expect(within(space).getByText('Confirmé')).toBeInTheDocument()
  expect(within(space).getByText('En attente')).toBeInTheDocument()
  expect(within(space).getByText('Annulé')).toBeInTheDocument()
})
