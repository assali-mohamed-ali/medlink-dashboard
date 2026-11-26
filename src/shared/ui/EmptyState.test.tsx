import { render, screen } from '@testing-library/react'
import { FileText } from 'lucide-react'
import { expect, test } from 'vitest'
import EmptyState from './EmptyState'

test('says what will be here in one sentence, with one action, the icon hidden', () => {
  const { container } = render(
    <EmptyState
      icon={FileText}
      title="Aucun document pour l’instant"
      action={<a href="/aide">Comment ça marche</a>}
    >
      Vos comptes rendus et ordonnances apparaîtront ici.
    </EmptyState>,
  )
  expect(screen.getByRole('heading', { name: 'Aucun document pour l’instant' })).toBeInTheDocument()
  expect(screen.getByText('Vos comptes rendus et ordonnances apparaîtront ici.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Comment ça marche' })).toBeInTheDocument()
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})
