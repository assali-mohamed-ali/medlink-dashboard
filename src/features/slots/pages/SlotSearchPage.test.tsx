import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Appointment, Slot, SlotFilters } from '../types'
import SlotSearchPage from './SlotSearchPage'

// MLink-101: the patient's slot search, as a week grid (Stitch "Prendre un rendez-vous"). The API is mocked at the
// feature's api.ts; times are built in local time, so the tests hold in any time zone.
vi.mock('../api', () => ({ fetchSlotFilters: vi.fn(), searchSlots: vi.fn(), bookSlot: vi.fn() }))
const bookSlot = vi.mocked(api.bookSlot)
const fetchSlotFilters = vi.mocked(api.fetchSlotFilters)
const searchSlots = vi.mocked(api.searchSlots)

const SOUSSE = 'c1000000-0000-4000-8000-000000000001'
const SFAX = 'c1000000-0000-4000-8000-000000000002'
const CARDIOLOGY = '5e000000-0000-4000-8000-000000000002'
const PEDIATRICS = '5e000000-0000-4000-8000-000000000003'
const CARDIOLOGIST = 'd0c70000-0000-4000-8000-000000000002'
const PEDIATRICIAN = 'd0c70000-0000-4000-8000-000000000003'

const FILTERS: SlotFilters = {
  clinics: [
    { id: SFAX, name: 'Clinique MedLink Sfax', city: 'Sfax' },
    { id: SOUSSE, name: 'Clinique MedLink Sousse', city: 'Sousse' },
  ],
  specialties: [
    { id: CARDIOLOGY, name: 'Cardiologie' },
    { id: PEDIATRICS, name: 'Pédiatrie' },
  ],
  // In the API's order (French order by last name)
  practitioners: [
    { id: PEDIATRICIAN, firstName: 'Omar', lastName: 'Gharbi', specialtyId: PEDIATRICS, clinicIds: [SOUSSE] },
    { id: CARDIOLOGIST, firstName: 'Rim', lastName: 'Jaziri', specialtyId: CARDIOLOGY, clinicIds: [SFAX] },
  ],
}

/** Wednesday 11 November 2026, 10:00, local time: the shown week runs from Monday 9 to Saturday 14. */
const NOW = new Date(2026, 10, 11, 10, 0)
const MONDAY = new Date(2026, 10, 9)
const NEXT_MONDAY = new Date(2026, 10, 16)

function slot(id: string, start: Date, minutes = 30): Slot {
  return {
    slotId: id,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
    clinic: { id: SFAX, name: 'Clinique MedLink Sfax' },
    practitioner: { id: CARDIOLOGIST, firstName: 'Rim', lastName: 'Jaziri' },
    specialty: 'Cardiologie',
  }
}

/** The search of the week starting on `monday`: Monday 00:00 to Sunday 00:00, local time, as ISO instants. */
function weekOf(monday: Date) {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: monday.toISOString(), to: sunday.toISOString() }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SlotSearchPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  fetchSlotFilters.mockResolvedValue(FILTERS)
  searchSlots.mockResolvedValue({
    items: [slot('s1', new Date(2026, 10, 10, 9, 0)), slot('s2', new Date(2026, 10, 12, 14, 0))],
    total: 2,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

test('shows the current week, earliest first, each slot in its day column', async () => {
  renderPage()

  expect(screen.getByRole('heading', { name: 'Prendre un rendez-vous' })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Semaine du 9 au 14 novembre 2026' })).toBeInTheDocument()
  expect(await screen.findByText('2 créneaux libres')).toBeInTheDocument()
  expect(searchSlots).toHaveBeenCalledWith({ ...weekOf(MONDAY), page: 0, size: 50 })

  const tuesday = screen.getByRole('region', { name: 'mardi 10 novembre' })
  expect(within(tuesday).getByText('09:00 – 09:30')).toBeInTheDocument()
  expect(within(tuesday).getByText('Dr Rim Jaziri')).toBeInTheDocument()
  expect(within(tuesday).getByText('Cardiologie')).toBeInTheDocument()
  expect(within(tuesday).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  const thursday = screen.getByRole('region', { name: 'jeudi 12 novembre' })
  expect(within(thursday).getByText('14:00 – 14:30')).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: 'lundi 9 novembre' })).queryByText(/Dr /)).toBeNull()
})

test('loads every page of the week (the API gives 50 slots at most per call)', async () => {
  const first = Array.from({ length: 50 }, (_, i) => slot(`a${i}`, new Date(2026, 10, 10, 8, 0 + i)))
  const second = Array.from({ length: 10 }, (_, i) => slot(`b${i}`, new Date(2026, 10, 11, 8, 0 + i)))
  searchSlots
    .mockResolvedValueOnce({ items: first, total: 60 })
    .mockResolvedValueOnce({ items: second, total: 60 })

  renderPage()

  expect(await screen.findByText('60 créneaux libres')).toBeInTheDocument()
  expect(searchSlots).toHaveBeenCalledWith({ ...weekOf(MONDAY), page: 0, size: 50 })
  expect(searchSlots).toHaveBeenCalledWith({ ...weekOf(MONDAY), page: 1, size: 50 })
  expect(screen.getAllByRole('button', { name: 'Choisir ce créneau' })).toHaveLength(60)
})

test('the arrows, "Aujourd’hui" and the month calendar change the week', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('2 créneaux libres')

  await user.click(screen.getByRole('button', { name: 'Semaine suivante' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 16 au 21 novembre 2026' })).toBeInTheDocument()
  expect(searchSlots).toHaveBeenLastCalledWith({ ...weekOf(NEXT_MONDAY), page: 0, size: 50 })

  await user.click(screen.getByRole('button', { name: 'Aujourd’hui' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 9 au 14 novembre 2026' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'vendredi 20 novembre 2026' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 16 au 21 novembre 2026' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 9 au 14 novembre 2026' })).toBeInTheDocument()
})

test('the filters come from the API and narrow the search; a clinic keeps only its practitioners', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('2 créneaux libres')
  const practitioner = screen.getByRole('combobox', { name: 'Praticien' })
  expect(within(practitioner).getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Tous les praticiens',
    'Dr Omar Gharbi',
    'Dr Rim Jaziri',
  ])

  await user.click(screen.getByRole('button', { name: 'Sfax' }))
  expect(screen.getByRole('button', { name: 'Sfax' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(practitioner).getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Tous les praticiens',
    'Dr Rim Jaziri',
  ])
  expect(searchSlots).toHaveBeenLastCalledWith({ ...weekOf(MONDAY), clinicId: SFAX, page: 0, size: 50 })

  await user.click(screen.getByRole('radio', { name: 'Cardiologie' }))
  expect(searchSlots).toHaveBeenLastCalledWith({
    ...weekOf(MONDAY),
    clinicId: SFAX,
    specialtyId: CARDIOLOGY,
    page: 0,
    size: 50,
  })

  await user.selectOptions(practitioner, 'Dr Rim Jaziri')
  expect(searchSlots).toHaveBeenLastCalledWith({
    ...weekOf(MONDAY),
    clinicId: SFAX,
    specialtyId: CARDIOLOGY,
    practitionerId: CARDIOLOGIST,
    page: 0,
    size: 50,
  })

  await user.click(screen.getByRole('button', { name: 'Toutes' }))
  await user.click(screen.getByRole('radio', { name: 'Toutes les spécialités' }))
  expect(searchSlots).toHaveBeenLastCalledWith({
    ...weekOf(MONDAY),
    practitionerId: CARDIOLOGIST,
    page: 0,
    size: 50,
  })
})

test('an empty week shows the API message, which suggests widening the search', async () => {
  searchSlots.mockResolvedValue({
    items: [],
    total: 0,
    message: 'Aucun créneau disponible. Élargissez la recherche (dates, clinique ou spécialité).',
  })

  renderPage()

  expect(
    await screen.findByText('Aucun créneau disponible. Élargissez la recherche (dates, clinique ou spécialité).'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Choisir ce créneau' })).toBeNull()
})

test('a 400 shows each server message under its field', async () => {
  searchSlots.mockRejectedValue(
    new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', {
      to: 'La période ne peut pas dépasser 31 jours.',
      clinicId: 'Identifiant invalide.',
    }),
  )

  renderPage()

  const weekError = await screen.findByText('La période ne peut pas dépasser 31 jours.')
  expect(weekError).toHaveAttribute('role', 'alert')
  const clinics = screen.getByRole('group', { name: 'Clinique' })
  expect(within(clinics).getByText('Identifiant invalide.')).toHaveAttribute('role', 'alert')
})

test('any other failure shows a message, and the page stays', async () => {
  searchSlots.mockRejectedValue(new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service momentanément indisponible.'))

  renderPage()

  expect(await screen.findByText('Service momentanément indisponible.')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Prendre un rendez-vous' })).toBeInTheDocument()
})

// ---- MLink-105: book from the results, then a confirmation screen ------------------------------------

const BOOKED: Appointment = {
  id: 'a1',
  status: 'BOOKED',
  clinic: { id: SFAX, name: 'Clinique MedLink Sfax' },
  practitioner: { id: CARDIOLOGIST, firstName: 'Rim', lastName: 'Jaziri' },
  startsAt: new Date(2026, 10, 10, 9, 0).toISOString(),
  endsAt: new Date(2026, 10, 10, 9, 30).toISOString(),
}

/** Opens the confirmation of Tuesday 10's 09:00 slot (the first of the week). */
async function chooseFirstSlot(user: ReturnType<typeof userEvent.setup>) {
  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  await user.click(within(tuesday).getByRole('button', { name: 'Choisir ce créneau' }))
  return screen.getByRole('dialog', { name: 'Confirmer ce rendez-vous ?' })
}

test('choosing a slot asks to confirm it, with its day, time, practitioner and clinic', async () => {
  const user = userEvent.setup()
  renderPage()

  const dialog = await chooseFirstSlot(user)

  expect(within(dialog).getByText('mardi 10 novembre 2026')).toBeInTheDocument()
  expect(within(dialog).getByText('09:00 – 09:30')).toBeInTheDocument()
  expect(within(dialog).getByText('Dr Rim Jaziri · Cardiologie')).toBeInTheDocument()
  expect(within(dialog).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  expect(bookSlot).not.toHaveBeenCalled()
})

test('"Annuler" closes the confirmation and books nothing', async () => {
  const user = userEvent.setup()
  renderPage()
  const dialog = await chooseFirstSlot(user)

  await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

  expect(screen.queryByRole('dialog')).toBeNull()
  expect(bookSlot).not.toHaveBeenCalled()
})

test('201: the confirmation screen shows the clinic, the practitioner, the date and the time', async () => {
  const user = userEvent.setup()
  bookSlot.mockResolvedValue(BOOKED)
  renderPage()
  const dialog = await chooseFirstSlot(user)

  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

  expect(bookSlot).toHaveBeenCalledWith('s1')
  const confirmed = await screen.findByRole('dialog', { name: 'Rendez-vous confirmé' })
  expect(within(confirmed).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  expect(within(confirmed).getByText('Dr Rim Jaziri')).toBeInTheDocument()
  expect(within(confirmed).getByText('mardi 10 novembre 2026')).toBeInTheDocument()
  expect(within(confirmed).getByText('09:00 – 09:30')).toBeInTheDocument()
})

test('after a booking, going back to the slots reloads the week (the booked slot is gone)', async () => {
  const user = userEvent.setup()
  bookSlot.mockResolvedValue(BOOKED)
  renderPage()
  const dialog = await chooseFirstSlot(user)
  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))
  const searches = searchSlots.mock.calls.length

  await user.click(await screen.findByRole('button', { name: 'Retour aux créneaux' }))

  expect(screen.queryByRole('dialog')).toBeNull()
  expect(searchSlots.mock.calls.length).toBeGreaterThan(searches)
})

test('409: the API message is shown and the results are refreshed', async () => {
  const user = userEvent.setup()
  bookSlot.mockRejectedValue(
    new ApiError(409, 'SLOT_TAKEN', 'Ce créneau n’est plus disponible. Choisissez-en un autre.'),
  )
  renderPage()
  const dialog = await chooseFirstSlot(user)
  const searches = searchSlots.mock.calls.length

  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

  expect(await screen.findByText('Ce créneau n’est plus disponible. Choisissez-en un autre.')).toHaveAttribute(
    'role',
    'alert',
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(searchSlots.mock.calls.length).toBeGreaterThan(searches)
})

test('403 without a patient profile: the API message stays in the confirmation', async () => {
  const user = userEvent.setup()
  bookSlot.mockRejectedValue(
    new ApiError(403, 'PATIENT_PROFILE_REQUIRED', 'Complétez votre profil patient avant de réserver.'),
  )
  renderPage()
  const dialog = await chooseFirstSlot(user)

  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

  expect(await within(dialog).findByText('Complétez votre profil patient avant de réserver.')).toHaveAttribute(
    'role',
    'alert',
  )
})
