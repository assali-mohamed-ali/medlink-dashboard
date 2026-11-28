import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import * as slotsApi from '@/features/slots/api'
import * as agendaApi from '@/features/agenda/api'
import * as staffHomeApi from '@/features/staff-home/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'

// UI refresh B6 (docs/ui-refresh/PLAN.md §4.5): each space's home greets the person and shows what matters for the
// role; what is not built yet says "Bientôt disponible", never fake data
vi.mock('@/features/auth/api', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
const fetchMe = vi.mocked(authApi.fetchMe)
// The patient's home reads their appointments
vi.mock('@/features/slots/api', () => ({ fetchMyAppointments: vi.fn(), cancelAppointment: vi.fn() }))
// The practitioner's home reads their agenda
vi.mock('@/features/agenda/api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
// The staff's home reads the accounts, the practitioners and the audit trail
vi.mock('@/features/staff-home/api', () => ({
  fetchAccountsOverview: vi.fn(),
  fetchPractitioners: vi.fn(),
  fetchAuditEntries: vi.fn(),
}))

function renderHome(role: Role, path: string) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
  })
  render(
    <AuthProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(slotsApi.fetchMyAppointments).mockResolvedValue({ items: [], total: 0 })
  vi.mocked(agendaApi.fetchAgenda).mockResolvedValue({ clinics: [], items: [] })
  vi.mocked(staffHomeApi.fetchAccountsOverview).mockResolvedValue({ items: [], total: 0 })
  vi.mocked(staffHomeApi.fetchPractitioners).mockResolvedValue([])
  vi.mocked(staffHomeApi.fetchAuditEntries).mockResolvedValue({ items: [], page: 0, size: 1, totalElements: 0, totalPages: 0 })
})

test('the patient has their own home: the greeting, then booking and their appointments in one click', async () => {
  renderHome('PATIENT', '/patient')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour, Amel' })
  expect(main.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', '/patient/creneaux')
  expect(main.getByRole('link', { name: /^Mes rendez-vous/ })).toHaveAttribute('href', '/patient/rendez-vous')
  expect(await main.findByRole('region', { name: 'Prochain rendez-vous' })).toBeInTheDocument()
})

test('the practitioner has their own home: the greeting, then the day and the agenda in one click', async () => {
  renderHome('PRACTITIONER', '/praticien')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour Amel' })
  expect(main.getByRole('link', { name: 'Ouvrir l’agenda' })).toHaveAttribute('href', '/praticien/agenda')
  expect(await main.findByRole('region', { name: 'Aujourd’hui' })).toBeInTheDocument()
})

test("the staff has their own home: the greeting, then accounts, the audit log, the statistics and the clinics' appointments in one click", async () => {
  renderHome('ADMINISTRATIVE_STAFF', '/admin')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour Amel' })
  expect(main.getByRole('link', { name: 'Nouveau compte' })).toHaveAttribute('href', '/admin/comptes?nouveau')
  expect(main.getByRole('link', { name: 'Gérer les comptes' })).toHaveAttribute('href', '/admin/comptes')
  expect(main.getByRole('link', { name: 'Voir le journal d’audit' })).toHaveAttribute('href', '/admin/journal-audit')
  expect(main.getByRole('link', { name: /Statistiques anonymisées/ })).toHaveAttribute('href', '/admin/statistiques')
  expect(main.getByRole('link', { name: 'Rendez-vous des cliniques' })).toHaveAttribute('href', '/admin/rendez-vous')
  expect(await main.findByRole('list', { name: 'Le réseau en chiffres' })).toBeInTheDocument()
  expect(main.queryByText('Bientôt disponible')).toBeNull()
})
