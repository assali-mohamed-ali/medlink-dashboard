import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { exportStats } from '../api'
import StatsExportPage from './StatsExportPage'

vi.mock('../api', () => ({ exportStats: vi.fn() }))
beforeEach(() => vi.resetAllMocks())

test('rejects overlapping dates and submits only one closed-month indicator', async () => {
  const user = userEvent.setup()
  vi.mocked(exportStats).mockResolvedValue({ csv: 'indicator,group,count\n', rows: [], filename: 'stats.csv' })
  render(<StatsExportPage />)
  const from = screen.getByLabelText('Date de début')
  const to = screen.getByLabelText('Date de fin')
  // Native date inputs are updated with a change event rather than typing locale-specific values.
  const { fireEvent } = await import('@testing-library/react')
  fireEvent.change(from, { target: { value: '2002-02-02' } })
  fireEvent.change(to, { target: { value: '2002-02-28' } })
  await user.click(screen.getByRole('button', { name: 'Exporter les statistiques' }))
  expect(screen.getByText('Choisissez un mois civil terminé, du premier au dernier jour.')).toBeInTheDocument()
  expect(exportStats).not.toHaveBeenCalled()
  fireEvent.change(from, { target: { value: '2002-02-01' } })
  await user.click(screen.getByRole('radio', { name: 'Rendez-vous par spécialité' }))
  expect(screen.getByRole('radio', { name: 'Rendez-vous par statut' })).not.toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Exporter les statistiques' }))
  await waitFor(() => expect(exportStats).toHaveBeenCalledWith({
    from: '2002-02-01', to: '2002-02-28', indicators: ['APPOINTMENTS_PER_SPECIALTY'],
  }))
})
