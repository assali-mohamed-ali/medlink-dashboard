import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { AdminPractitioner, SupervisedAgenda } from '../types'
import ClinicActivityPage from './ClinicActivityPage'

vi.mock('../api', () => ({ fetchPractitioners: vi.fn(), fetchPractitionerAgenda: vi.fn(), fetchClinics: vi.fn(), fetchClinicActivity: vi.fn() }))
const fetchPractitioners = vi.mocked(api.fetchPractitioners)
const fetchPractitionerAgenda = vi.mocked(api.fetchPractitionerAgenda)

const SOUSSE = { id: 'c1', name: 'Clinique MedLink Sousse' }
const TUNIS = { id: 'c3', name: 'Clinique MedLink Tunis' }
const KARIM: AdminPractitioner = {
  id: 'p1',
  firstName: 'Karim',
  lastName: 'Ben Ali',
  specialty: { id: 's1', name: 'Cardiologie' },
  clinics: [SOUSSE, TUNIS],
}
const LINA: AdminPractitioner = {
  id: 'p2',
  firstName: 'Lina',
  lastName: 'Trabelsi',
  specialty: { id: 's2', name: 'Pédiatrie' },
  clinics: [TUNIS],
}

// Wednesday 2 December 2026, 10:00 in Tunis: the week shown first is Monday 30 November to Saturday 5 December
const NOW = new Date('2026-12-02T09:00:00Z')

const AGENDA: SupervisedAgenda = {
  clinics: [SOUSSE, TUNIS],
  items: [
    { slotId: 'a', status: 'OPEN', startsAt: '2026-12-01T08:00:00Z', endsAt: '2026-12-01T08:30:00Z', clinic: SOUSSE },
    {
      slotId: 'b',
      status: 'BOOKED',
      startsAt: '2026-12-01T09:00:00Z',
      endsAt: '2026-12-01T09:30:00Z',
      clinic: SOUSSE,
      appointment: { id: 'ap1', status: 'BOOKED', patient: { id: 'pa1', firstName: 'Amel', lastName: 'Ben Salah' } },
    },
    { slotId: 'c', status: 'CLOSED', startsAt: '2026-12-03T13:00:00Z', endsAt: '2026-12-03T13:30:00Z', clinic: TUNIS },
  ],
}

function renderPage() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(
    <MemoryRouter>
      <ClinicActivityPage />
    </MemoryRouter>,
  )
  return user
}

async function choose(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.selectOptions(await screen.findByLabelText('Praticien'), name)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.mocked(api.fetchClinics).mockResolvedValue([])
  fetchPractitioners.mockResolvedValue([KARIM, LINA])
  fetchPractitionerAgenda.mockResolvedValue(AGENDA)
})

afterEach(() => {
  vi.useRealTimers()
})

test('lists the practitioners with their specialty and asks to choose one before showing anything', async () => {
  renderPage()

  expect(screen.getByRole('heading', { level: 2, name: 'Rendez-vous des cliniques' })).toBeInTheDocument()
  const select = await screen.findByLabelText('Praticien')
  expect(within(select).getByRole('option', { name: 'Ben Ali Karim · Cardiologie' })).toBeInTheDocument()
  expect(within(select).getByRole('option', { name: 'Trabelsi Lina · Pédiatrie' })).toBeInTheDocument()
  expect(screen.getByText('Choisissez un praticien pour voir sa semaine.')).toBeInTheDocument()
  expect(fetchPractitionerAgenda).not.toHaveBeenCalled()
})

test("a chosen practitioner's week shows each slot's time, clinic and status, and the patient of a booked one", async () => {
  const user = renderPage()
  await choose(user, 'Ben Ali Karim · Cardiologie')

  // Monday 30 November 00:00 to Sunday 6 December 00:00, Tunis time
  expect(fetchPractitionerAgenda).toHaveBeenCalledWith('p1', '2026-11-29T23:00:00.000Z', '2026-12-05T23:00:00.000Z')
  const tuesday = await screen.findByRole('region', { name: 'mardi 1 décembre' })
  const items = within(tuesday).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('09:00 – 09:30')
  expect(items[0]).toHaveTextContent('Clinique MedLink Sousse')
  expect(items[0]).toHaveTextContent('Disponible')
  expect(items[1]).toHaveTextContent('10:00 – 10:30')
  expect(items[1]).toHaveTextContent('Réservé')
  expect(items[1]).toHaveTextContent('Amel Ben Salah')
  const thursday = screen.getByRole('region', { name: 'jeudi 3 décembre' })
  expect(within(thursday).getByRole('listitem')).toHaveTextContent('Fermé')
  // A day without a slot is not listed
  expect(screen.queryByRole('region', { name: 'lundi 30 novembre' })).toBeNull()
})

test('the view is read only: no action on a slot, no link to a medical record', async () => {
  const user = renderPage()
  await choose(user, 'Ben Ali Karim · Cardiologie')
  const tuesday = await screen.findByRole('region', { name: 'mardi 1 décembre' })

  expect(within(tuesday).queryByRole('button')).toBeNull()
  expect(within(tuesday).queryByRole('link')).toBeNull()
})

test('the week buttons move the period and ask again', async () => {
  const user = renderPage()
  await choose(user, 'Ben Ali Karim · Cardiologie')
  await screen.findByRole('region', { name: 'mardi 1 décembre' })

  await user.click(screen.getByRole('button', { name: 'Semaine suivante' }))
  expect(fetchPractitionerAgenda).toHaveBeenLastCalledWith('p1', '2026-12-06T23:00:00.000Z', '2026-12-12T23:00:00.000Z')

  await user.click(screen.getByRole('button', { name: 'Cette semaine' }))
  expect(fetchPractitionerAgenda).toHaveBeenLastCalledWith('p1', '2026-11-29T23:00:00.000Z', '2026-12-05T23:00:00.000Z')

  await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
  expect(fetchPractitionerAgenda).toHaveBeenLastCalledWith('p1', '2026-11-22T23:00:00.000Z', '2026-11-28T23:00:00.000Z')
})

test('a week without a slot says so', async () => {
  fetchPractitionerAgenda.mockResolvedValue({ clinics: [TUNIS], items: [] })
  const user = renderPage()
  await choose(user, 'Trabelsi Lina · Pédiatrie')

  expect(await screen.findByText('Aucun créneau cette semaine')).toBeInTheDocument()
})

test('a failed load shows the message and "Réessayer" asks again', async () => {
  fetchPractitionerAgenda
    .mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Service indisponible.'))
    .mockResolvedValueOnce(AGENDA)
  const user = renderPage()
  await choose(user, 'Ben Ali Karim · Cardiologie')

  expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('region', { name: 'mardi 1 décembre' })).toBeInTheDocument()
})

test('a failed list of practitioners shows the message and "Réessayer" asks again', async () => {
  fetchPractitioners
    .mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Service indisponible.'))
    .mockResolvedValueOnce([KARIM])
  const user = renderPage()

  expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByLabelText('Praticien')).toBeInTheDocument()
})

test('a failed clinic leaves the other clinic available and can be retried independently', async () => {
  vi.mocked(api.fetchClinics).mockResolvedValue([{ ...SOUSSE, city: 'Sousse' }, { ...TUNIS, city: 'Tunis' }])
  const activity = vi.mocked(api.fetchClinicActivity)
  activity.mockImplementation((id) => id === SOUSSE.id
    ? Promise.reject(new ApiError(503, 'UNAVAILABLE', 'Clinique indisponible'))
    : Promise.resolve({ BOOKED: 12, CANCELLED: 2 }))
  const user = renderPage()

  expect(await screen.findByText('12')).toBeInTheDocument()
  expect(await screen.findByText('Clinique indisponible')).toBeInTheDocument()
  activity.mockResolvedValueOnce({ BOOKED: 9, CANCELLED: 0 })
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByText('9')).toBeInTheDocument()
  expect(activity.mock.calls.filter(([id]) => id === TUNIS.id)).toHaveLength(1)
})
