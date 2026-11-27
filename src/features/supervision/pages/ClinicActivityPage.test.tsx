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
  const list = await screen.findByRole('list', { name: 'Praticiens' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
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

test('lists the practitioners as cards (name, specialty, clinics) and asks to choose one before showing anything', async () => {
  renderPage()

  expect(screen.getByRole('heading', { level: 2, name: 'Rendez-vous des cliniques' })).toBeInTheDocument()
  expect(screen.getByText('Lecture seule')).toBeInTheDocument()
  const list = await screen.findByRole('list', { name: 'Praticiens' })
  const karim = within(list).getByRole('button', { name: /^Dr Karim Ben Ali/ })
  expect(karim).toHaveTextContent('Cardiologie')
  expect(karim).toHaveTextContent('Sousse')
  expect(karim).toHaveTextContent('Tunis')
  expect(karim).toHaveAttribute('aria-pressed', 'false')
  expect(within(list).getByRole('button', { name: /^Dr Lina Trabelsi/ })).toHaveTextContent('Pédiatrie')
  expect(screen.getByText('Choisissez un praticien pour voir sa semaine.')).toBeInTheDocument()
  expect(fetchPractitionerAgenda).not.toHaveBeenCalled()
})

test('the search keeps the practitioners whose name or specialty matches, accents or not', async () => {
  const user = renderPage()
  const list = await screen.findByRole('list', { name: 'Praticiens' })

  await user.type(screen.getByLabelText('Rechercher un praticien'), 'pediatrie')
  expect(within(list).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
    'Dr Lina Trabelsi, Pédiatrie',
  ])
  await user.clear(screen.getByLabelText('Rechercher un praticien'))
  await user.type(screen.getByLabelText('Rechercher un praticien'), 'personne')
  expect(screen.getByText('Aucun praticien ne correspond.')).toBeInTheDocument()
})

test("a chosen practitioner's week: their card, the week's counts, and six days with each slot as the API gives it", async () => {
  const user = renderPage()
  await choose(user, 'Dr Karim Ben Ali')

  // Monday 30 November 00:00 to Sunday 6 December 00:00, Tunis time
  expect(fetchPractitionerAgenda).toHaveBeenCalledWith('p1', '2026-11-29T23:00:00.000Z', '2026-12-05T23:00:00.000Z')
  expect(screen.getByRole('button', { name: /^Dr Karim Ben Ali/ })).toHaveAttribute('aria-pressed', 'true')
  const chosen = await screen.findByRole('region', { name: 'Dr Karim Ben Ali' })
  expect(chosen).toHaveTextContent('Cardiologie · Sousse, Tunis')
  const counts = within(chosen).getByRole('list', { name: 'La semaine en chiffres' })
  expect(within(counts).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['1réservé', '1libre', '1fermé'])
  expect(screen.getByText('Semaine du 30 novembre au 5 décembre 2026', { selector: 'b' })).toBeInTheDocument()
  expect(screen.getByText('Semaine 49 · heure de Tunis')).toBeInTheDocument()

  const tuesday = await screen.findByRole('region', { name: 'mardi 1 décembre' })
  const items = within(tuesday).getAllByRole('listitem')
  expect(items[0]).toHaveAccessibleName('09:00 – 09:30, Clinique MedLink Sousse, libre')
  expect(items[0]).toHaveTextContent('09:00Libre')
  expect(items[1]).toHaveAccessibleName('10:00 – 10:30, Clinique MedLink Sousse, réservé, Amel Ben Salah')
  // The patient as on the practitioner's agenda: "Amel B.", the whole name read out
  expect(items[1]).toHaveTextContent('Amel B.')
  expect(within(screen.getByRole('region', { name: 'jeudi 3 décembre' })).getByRole('listitem')).toHaveAccessibleName(
    '14:00 – 14:30, Clinique MedLink Tunis, fermé',
  )
  // Every day of the week is there, an empty one says so; today is marked
  expect(within(screen.getByRole('region', { name: 'lundi 30 novembre' })).getByText('Aucun créneau')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'mercredi 2 décembre' })).toHaveAttribute('aria-current', 'date')
})

test('the view is read only: no action on a slot, no link to a medical record', async () => {
  const user = renderPage()
  await choose(user, 'Dr Karim Ben Ali')
  const tuesday = await screen.findByRole('region', { name: 'mardi 1 décembre' })

  expect(within(tuesday).queryByRole('button')).toBeNull()
  expect(within(tuesday).queryByRole('link')).toBeNull()
})

test('the week buttons move the period and ask again', async () => {
  const user = renderPage()
  await choose(user, 'Dr Karim Ben Ali')
  await screen.findByRole('region', { name: 'mardi 1 décembre' })
  expect(screen.getByRole('button', { name: 'Cette semaine' })).toBeDisabled()

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
  await choose(user, 'Dr Lina Trabelsi')

  expect(await screen.findByText('Aucun créneau cette semaine')).toBeInTheDocument()
})

test('a failed load shows the message and "Réessayer" asks again', async () => {
  fetchPractitionerAgenda
    .mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Service indisponible.'))
    .mockResolvedValueOnce(AGENDA)
  const user = renderPage()
  await choose(user, 'Dr Karim Ben Ali')

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
  expect(await screen.findByRole('list', { name: 'Praticiens' })).toBeInTheDocument()
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
