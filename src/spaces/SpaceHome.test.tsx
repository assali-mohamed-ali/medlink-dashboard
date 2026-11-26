import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import * as slotsApi from '@/features/slots/api'
import * as agendaApi from '@/features/agenda/api'
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
})

test.each([
  ['ADMINISTRATIVE_STAFF', '/admin', ['Gestion des comptes', 'Statistiques', 'Rendez-vous des cliniques']],
] as const)('a %s is greeted by name and sees the parts of their space', async (role, path, parts) => {
  renderHome(role, path)
  expect(await screen.findByRole('heading', { level: 2, name: 'Bonjour Amel' })).toBeInTheDocument()
  const titles = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
  expect(titles).toEqual(parts)
})

test('the patient has their own home: the greeting, then booking and their appointments in one click', async () => {
  renderHome('PATIENT', '/patient')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour Amel' })
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

test('the staff home leads to account management and to the statistics in one click', async () => {
  renderHome('ADMINISTRATIVE_STAFF', '/admin')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour Amel' })
  expect(main.getByRole('link', { name: 'Ouvrir la gestion des comptes' })).toHaveAttribute('href', '/admin/comptes')
  expect(main.getByRole('link', { name: 'Ouvrir les statistiques' })).toHaveAttribute('href', '/admin/statistiques')
  expect(main.getAllByText('Bientôt disponible')).toHaveLength(1)
})
