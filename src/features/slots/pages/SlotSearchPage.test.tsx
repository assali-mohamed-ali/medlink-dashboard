import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Appointment, Slot, SlotFilters } from '../types'
import SlotSearchPage from './SlotSearchPage'

// MLink-101: the patient's slot search, as a week grid (Stitch "Prendre un rendez-vous"). The API is mocked at the
// feature's api.ts; times are built in local time, so the tests hold in any time zone.
vi.mock('../api', () => ({
  fetchSlotFilters: vi.fn(),
  searchSlots: vi.fn(),
  bookSlot: vi.fn(),
  rescheduleAppointment: vi.fn(),
  fetchMyAppointments: vi.fn(),
}))
const bookSlot = vi.mocked(api.bookSlot)
const rescheduleAppointment = vi.mocked(api.rescheduleAppointment)
const fetchSlotFilters = vi.mocked(api.fetchSlotFilters)
const searchSlots = vi.mocked(api.searchSlots)
const fetchMyAppointments = vi.mocked(api.fetchMyAppointments)

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
  // The patient's own appointments: none by default
  fetchMyAppointments.mockResolvedValue({ items: [], total: 0 })
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
  expect(screen.getAllByRole('button', { name: 'Réserver' })).toHaveLength(60)
})

/** Review on #18: a busy week of more than 500 slots is loaded whole, so the last slot can be booked too. */
test('a week of more than 500 slots is loaded to its last page, and the count matches the grid', async () => {
  const all = Array.from({ length: 520 }, (_, i) => slot(`w${i}`, new Date(2026, 10, 9 + (i % 6), 8, i)))
  searchSlots.mockImplementation(async ({ page = 0, size = 50 }) => ({
    items: all.slice(page * size, page * size + size),
    total: all.length,
  }))

  renderPage()

  expect(await screen.findByText('520 créneaux libres', {}, { timeout: 15_000 })).toBeInTheDocument()
  expect(searchSlots).toHaveBeenCalledWith({ ...weekOf(MONDAY), page: 10, size: 50 })
  // By text, not by role: 520 cards make role queries slow in jsdom
  expect(screen.getAllByText('Réserver')).toHaveLength(520)
}, 30_000)

/** The loop never runs away: a page that comes back empty (the week changed meanwhile) ends the loading. */
test('an empty page stops the loading, and the count shows what the grid holds', async () => {
  const first = Array.from({ length: 50 }, (_, i) => slot(`e${i}`, new Date(2026, 10, 10, 8, i)))
  searchSlots.mockResolvedValueOnce({ items: first, total: 120 }).mockResolvedValue({ items: [], total: 120 })

  renderPage()

  expect(await screen.findByText('50 créneaux libres')).toBeInTheDocument()
  expect(searchSlots).toHaveBeenCalledTimes(2)
  expect(screen.getAllByRole('button', { name: 'Réserver' })).toHaveLength(50)
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
  const practitioners = screen.getByRole('group', { name: 'Praticien' })
  expect(within(practitioners).getAllByRole('radio').map((r) => r.getAttribute('data-name'))).toEqual([
    'Tous les praticiens',
    'Dr Omar Gharbi',
    'Dr Rim Jaziri',
  ])

  await user.click(screen.getByRole('radio', { name: 'Sfax' }))
  expect(screen.getByRole('radio', { name: 'Sfax' })).toBeChecked()
  expect(within(practitioners).queryByRole('radio', { name: 'Dr Omar Gharbi' })).toBeNull()
  expect(within(practitioners).getByRole('radio', { name: 'Dr Rim Jaziri' })).toBeInTheDocument()
  expect(searchSlots).toHaveBeenLastCalledWith({ ...weekOf(MONDAY), clinicId: SFAX, page: 0, size: 50 })

  await user.click(screen.getByRole('radio', { name: 'Cardiologie' }))
  expect(searchSlots).toHaveBeenLastCalledWith({
    ...weekOf(MONDAY),
    clinicId: SFAX,
    specialtyId: CARDIOLOGY,
    page: 0,
    size: 50,
  })

  await user.click(within(practitioners).getByRole('radio', { name: 'Dr Rim Jaziri' }))
  expect(searchSlots).toHaveBeenLastCalledWith({
    ...weekOf(MONDAY),
    clinicId: SFAX,
    specialtyId: CARDIOLOGY,
    practitionerId: CARDIOLOGIST,
    page: 0,
    size: 50,
  })

  await user.click(screen.getByRole('radio', { name: 'Toutes les cliniques' }))
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
  expect(screen.queryByRole('button', { name: 'Réserver' })).toBeNull()
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
  await user.click(within(tuesday).getByRole('button', { name: 'Réserver' }))
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

  // The UI kit's Alert wraps the text: the alert is the box around it
  expect((await screen.findByText('Ce créneau n’est plus disponible. Choisissez-en un autre.')).closest('[role="alert"]')).not.toBeNull()
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

// ---- MLink-109: "Reporter" from my appointments opens this page to choose the new slot ---------------------

/** The page in move mode (?reporter=a9), inside routes so that "Voir mes rendez-vous" can be followed. */
function renderMove() {
  return render(
    <MemoryRouter initialEntries={['/patient/creneaux?reporter=a9']}>
      <Routes>
        <Route path="/patient/creneaux" element={<SlotSearchPage />} />
        <Route path="/patient/rendez-vous" element={<p>Page mes rendez-vous</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

test('move mode: a banner says so, and the chosen slot is confirmed as the new one', async () => {
  const user = userEvent.setup()
  rescheduleAppointment.mockResolvedValue(BOOKED)
  renderMove()

  expect(screen.getByText(/Report d’un rendez-vous : choisissez le nouveau créneau/)).toBeInTheDocument()
  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  await user.click(within(tuesday).getByRole('button', { name: 'Réserver' }))
  const dialog = screen.getByRole('dialog', { name: 'Confirmer le report ?' })
  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

  expect(rescheduleAppointment).toHaveBeenCalledWith('a9', 's1')
  expect(bookSlot).not.toHaveBeenCalled()
  const moved = await screen.findByRole('dialog', { name: 'Rendez-vous reporté' })
  expect(within(moved).getByText('mardi 10 novembre 2026')).toBeInTheDocument()
  expect(within(moved).getByText('09:00 – 09:30')).toBeInTheDocument()

  await user.click(within(moved).getByRole('button', { name: 'Voir mes rendez-vous' }))
  expect(await screen.findByText('Page mes rendez-vous')).toBeInTheDocument()
})

test('move mode, 409: the slot is taken, the message says to choose another and the week is refreshed', async () => {
  const user = userEvent.setup()
  rescheduleAppointment.mockRejectedValue(
    new ApiError(409, 'SLOT_TAKEN', 'Ce créneau n’est plus disponible. Choisissez-en un autre.'),
  )
  renderMove()
  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  await user.click(within(tuesday).getByRole('button', { name: 'Réserver' }))
  const searches = searchSlots.mock.calls.length

  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmer' }))

  // The UI kit's Alert wraps the text: the alert is the box around it
  expect((await screen.findByText('Ce créneau n’est plus disponible. Choisissez-en un autre.')).closest('[role="alert"]')).not.toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(searchSlots.mock.calls.length).toBeGreaterThan(searches)
})

test('move mode, 422: the API message (deadline passed) stays in the confirmation', async () => {
  const user = userEvent.setup()
  rescheduleAppointment.mockRejectedValue(
    new ApiError(422, 'CANCEL_DEADLINE_PASSED', 'Ce rendez-vous ne peut plus être annulé moins de 12 heures avant son début.'),
  )
  renderMove()
  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  await user.click(within(tuesday).getByRole('button', { name: 'Réserver' }))
  const dialog = screen.getByRole('dialog', { name: 'Confirmer le report ?' })

  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

  expect(
    await within(dialog).findByText('Ce rendez-vous ne peut plus être annulé moins de 12 heures avant son début.'),
  ).toHaveAttribute('role', 'alert')
})

// ---- The Stitch design of the week (rows by time, counts from the week shown, legend) ---------------------

test('the filters count the free slots of the week shown, from the slots the grid holds', async () => {
  renderPage()
  await screen.findByText('2 créneaux libres')

  expect(screen.getByRole('radio', { name: 'Cardiologie' })).toHaveAccessibleDescription('2 créneaux libres cette semaine')
  expect(screen.getByRole('radio', { name: 'Pédiatrie' })).toHaveAccessibleDescription('aucun créneau libre cette semaine')
  expect(screen.getByRole('radio', { name: 'Sfax' })).toHaveAccessibleDescription(
    'Clinique MedLink Sfax · 2 créneaux libres cette semaine',
  )
  expect(screen.getByRole('radio', { name: 'Sousse' })).toHaveAccessibleDescription(
    'Clinique MedLink Sousse · aucun créneau libre cette semaine',
  )
  expect(screen.getByRole('radio', { name: 'Dr Rim Jaziri' })).toHaveAccessibleDescription(
    'Cardiologie · 2 créneaux libres cette semaine',
  )
})

test('a filter that is chosen no longer counts its own group: the other choices were not searched', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('2 créneaux libres')

  await user.click(screen.getByRole('radio', { name: 'Cardiologie' }))
  await screen.findByText('2 créneaux libres')

  expect(screen.getByRole('radio', { name: 'Pédiatrie' })).toHaveAccessibleDescription('')
  // The other groups still count what this search found
  expect(screen.getByRole('radio', { name: 'Sfax' })).toHaveAccessibleDescription(
    'Clinique MedLink Sfax · 2 créneaux libres cette semaine',
  )
})

test('each slot card: practitioner, specialty, time and clinic, and "Réserver"', async () => {
  renderPage()

  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  const card = within(tuesday).getByRole('article', { name: 'Dr Rim Jaziri, 09:00 – 09:30' })
  expect(within(card).getByText('Cardiologie')).toBeInTheDocument()
  expect(within(card).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  expect(within(card).getByRole('button', { name: 'Réserver' })).toBeInTheDocument()
})

test('the days before today are marked as past', async () => {
  renderPage()
  await screen.findByText('2 créneaux libres')

  expect(screen.getByRole('region', { name: 'lundi 9 novembre' })).toHaveAttribute('data-past', 'true')
  expect(screen.getByRole('region', { name: 'mercredi 11 novembre' })).not.toHaveAttribute('data-past')
})

test('the legend gives each specialty of the week its colour and its number of free slots', async () => {
  renderPage()
  await screen.findByText('2 créneaux libres')

  const legend = screen.getByRole('list', { name: 'Légende des spécialités' })
  // Only the specialties that have a slot this week: the API knows many more (MLink-174)
  expect(within(legend).getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Cardiologie (2)'])
})

test('"Mes rendez-vous" leads to the patient’s appointments', async () => {
  renderPage()
  await screen.findByText('2 créneaux libres')

  expect(screen.getByRole('link', { name: 'Mes rendez-vous' })).toHaveAttribute('href', '/patient/rendez-vous')
})

// ---- MLink-167: one place at a time. The API refuses a slot that overlaps one of the patient's appointments
// (409 PATIENT_BUSY); the week says so before the patient tries ------------------------------------------------

function mine(id: string, start: Date, status = 'BOOKED'): Appointment {
  return { ...BOOKED, id, status, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 30 * 60_000).toISOString() }
}

test('a slot at the time of one of the patient’s appointments says which one, and cannot be booked', async () => {
  // Already booked on Tuesday 10, 09:00 – 09:30, elsewhere: the same time as the slot s1
  fetchMyAppointments.mockResolvedValue({ items: [mine('a7', new Date(2026, 10, 10, 9, 0))], total: 1 })
  renderPage()

  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  const busy = within(tuesday).getByRole('article', { name: 'Dr Rim Jaziri, 09:00 – 09:30' })
  // It says which appointment: its time, its practitioner, its clinic (from "Mes rendez-vous")
  expect(await within(busy).findByText('Déjà un rendez-vous à 09:00 avec Dr Rim Jaziri (Sfax)')).toBeInTheDocument()
  expect(within(busy).queryByRole('button', { name: 'Réserver' })).toBeNull()
  // Another time stays bookable
  const thursday = screen.getByRole('region', { name: 'jeudi 12 novembre' })
  expect(within(thursday).getByRole('button', { name: 'Réserver' })).toBeInTheDocument()
  expect(fetchMyAppointments).toHaveBeenCalledWith(0, 50)
})

test('a cancelled appointment at that time does not make the patient busy', async () => {
  fetchMyAppointments.mockResolvedValue({ items: [mine('a7', new Date(2026, 10, 10, 9, 0), 'CANCELLED')], total: 1 })
  renderPage()

  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  expect(within(tuesday).getByRole('button', { name: 'Réserver' })).toBeInTheDocument()
})

test('move mode: the appointment being moved does not block the slots at its own time', async () => {
  fetchMyAppointments.mockResolvedValue({ items: [mine('a9', new Date(2026, 10, 10, 9, 0))], total: 1 })
  renderMove()

  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  expect(within(tuesday).getByRole('button', { name: 'Réserver' })).toBeInTheDocument()
})

test('the patient’s appointments that cannot be read leave every slot bookable (the API still checks)', async () => {
  fetchMyAppointments.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible.'))
  renderPage()

  const tuesday = await screen.findByRole('region', { name: 'mardi 10 novembre' })
  expect(within(tuesday).getByRole('button', { name: 'Réserver' })).toBeInTheDocument()
})

test('409 PATIENT_BUSY: the API message stays in the confirmation, nothing is booked', async () => {
  const user = userEvent.setup()
  bookSlot.mockRejectedValue(new ApiError(409, 'PATIENT_BUSY', 'Vous avez déjà un rendez-vous à ce moment-là.'))
  renderPage()
  const dialog = await chooseFirstSlot(user)

  await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

  expect(await within(dialog).findByText('Vous avez déjà un rendez-vous à ce moment-là.')).toHaveAttribute('role', 'alert')
})

test('no promise the page cannot keep: no "Réservation en deux clics" line', async () => {
  renderPage()
  await screen.findByText('2 créneaux libres')

  expect(screen.queryByText(/Réservation en deux clics/)).toBeNull()
})
