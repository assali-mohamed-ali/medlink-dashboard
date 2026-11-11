import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import { ApiError } from '@/shared/api/apiClient'
import * as agendaApi from '@/features/agenda/api'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import * as api from './api'

// MLink-31 (31.4): the record opens from an appointment of the agenda, in the practitioner's space only.
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('@/features/agenda/api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
vi.mock('./api', () => ({ fetchPatientRecord: vi.fn() }))
const fetchMe = vi.mocked(authApi.fetchMe)

const PATIENT = { id: 'p1', firstName: 'Ahmed', lastName: 'Kacem', birthDate: '1985-03-12', phone: null }

function loggedInAs(role: Role) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'sami@example.com', firstName: 'Sami', lastName: 'Test', roles: [role] },
  })
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.fetchPatientRecord).mockResolvedValue({ patient: PATIENT, reports: [] })
})

test('clicking "Ouvrir le dossier" on an appointment of the agenda opens that patient’s record', async () => {
  const user = userEvent.setup()
  const startsAt = new Date(Date.now() + 86_400_000)
  startsAt.setUTCHours(9, 0, 0, 0)
  vi.mocked(agendaApi.fetchAgenda).mockResolvedValue({
    clinics: [{ id: 'c1', name: 'Clinique MedLink Sousse' }],
    items: [
      {
        slotId: 's1',
        status: 'BOOKED',
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 1_800_000).toISOString(),
        clinic: { id: 'c1', name: 'Clinique MedLink Sousse' },
        appointment: { id: 'a1', status: 'BOOKED', patient: { id: 'p1', firstName: 'Ahmed', lastName: 'Kacem' } },
      },
    ],
  })
  loggedInAs('PRACTITIONER')
  const router = renderAt('/praticien/agenda')

  const appointment = await screen.findByRole('listitem', { name: /réservé, Ahmed Kacem/ })
  await user.click(within(appointment).getByRole('link', { name: 'Ouvrir le dossier de Ahmed Kacem' }))

  expect(await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/praticien/patients/p1')
  expect(api.fetchPatientRecord).toHaveBeenCalledWith('p1')
})

test.each(['PATIENT', 'ADMINISTRATIVE_STAFF'] as const)('a %s gets "Accès refusé" and the API is never asked', async (role) => {
  loggedInAs(role)
  renderAt('/praticien/patients/p1')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(api.fetchPatientRecord).not.toHaveBeenCalled()
})

test('a practitioner opening an unknown patient’s record gets "Accès refusé", with no data (31.5)', async () => {
  vi.mocked(api.fetchPatientRecord).mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Access Denied'))
  loggedInAs('PRACTITIONER')
  renderAt('/praticien/patients/00000000-0000-4000-8000-000000000999')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(screen.getByText('Ce patient n’est pas rattaché à votre agenda.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Retour à l’agenda' })).toHaveAttribute('href', '/praticien/agenda')
  expect(screen.queryByText(/Ahmed|Kacem/)).toBeNull()
  // The space's own frame stays: one main landmark only
  expect(screen.getAllByRole('main')).toHaveLength(1)
})
