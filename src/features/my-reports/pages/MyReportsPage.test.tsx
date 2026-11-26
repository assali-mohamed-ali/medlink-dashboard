import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { MyReport } from '../types'
import MyReportsPage from './MyReportsPage'

// MLink-32 follow-up: the patient reads the consultation reports written about them (GET /api/reports/me), newest
// first, with who wrote each one. Read only. The API is mocked at the feature's api.ts; dates are in Tunis time.
vi.mock('../api', () => ({ fetchMyReports: vi.fn() }))
const fetchMyReports = vi.mocked(api.fetchMyReports)

const NEW: MyReport = {
  id: 'r2',
  createdAt: '2026-11-11T09:15:00Z',
  content: 'Douleur thoracique atypique, ECG normal. Contrôle dans un mois.',
  practitioner: { firstName: 'Nadia', lastName: 'Haddad', specialty: 'Cardiologie' },
}
const OLD: MyReport = {
  id: 'r1',
  createdAt: '2026-10-02T08:30:00Z',
  content: 'Bilan annuel sans particularité.',
  practitioner: { firstName: 'Leila', lastName: 'Ben Ali', specialty: 'Médecine générale' },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyReportsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchMyReports.mockResolvedValue([NEW, OLD])
})

test('lists the reports newest first, with the date in Tunis time, who wrote it and the text', async () => {
  renderPage()

  expect(screen.getByRole('heading', { level: 2, name: 'Mes comptes-rendus' })).toBeInTheDocument()
  const list = await screen.findByRole('list', { name: 'Vos comptes-rendus' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('11 novembre 2026 à 10:15')
  expect(items[0]).toHaveTextContent('Dr Nadia Haddad')
  expect(items[0]).toHaveTextContent('Cardiologie')
  expect(items[0]).toHaveTextContent('Douleur thoracique atypique, ECG normal. Contrôle dans un mois.')
  expect(items[1]).toHaveTextContent('2 octobre 2026 à 09:30')
  expect(items[1]).toHaveTextContent('Dr Leila Ben Ali')
  expect(fetchMyReports).toHaveBeenCalledTimes(1)
})

test('the list comes newest first even if the API order changes', async () => {
  fetchMyReports.mockResolvedValue([OLD, NEW])
  renderPage()

  const items = within(await screen.findByRole('list', { name: 'Vos comptes-rendus' })).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Dr Nadia Haddad')
})

test('a long report shows its start, then the whole text on demand', async () => {
  const user = userEvent.setup()
  fetchMyReports.mockResolvedValue([{ ...NEW, content: `${'a'.repeat(300)}FIN` }])
  renderPage()

  const item = within(await screen.findByRole('list', { name: 'Vos comptes-rendus' })).getByRole('listitem')
  expect(item).not.toHaveTextContent('FIN')
  await user.click(within(item).getByRole('button', { name: 'Lire la suite' }))
  expect(item).toHaveTextContent('FIN')
  expect(within(item).getByRole('button', { name: 'Réduire' })).toHaveAttribute('aria-expanded', 'true')
})

test('no report yet: says so, with what will appear here', async () => {
  fetchMyReports.mockResolvedValue([])
  renderPage()

  expect(await screen.findByRole('heading', { name: 'Aucun compte-rendu pour l’instant' })).toBeInTheDocument()
  expect(screen.getByText(/Après une consultation, le compte-rendu de votre médecin apparaîtra ici/)).toBeInTheDocument()
})

test('a failed read says why and offers to try again', async () => {
  const user = userEvent.setup()
  fetchMyReports.mockRejectedValueOnce(
    new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'),
  )
  renderPage()

  expect(await screen.findByRole('alert')).toHaveTextContent('Connexion impossible.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('list', { name: 'Vos comptes-rendus' })).toBeInTheDocument()
  expect(fetchMyReports).toHaveBeenCalledTimes(2)
})
