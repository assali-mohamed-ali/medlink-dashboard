import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Agenda, AgendaItem } from '../types'
import AgendaPage from './AgendaPage'

// MLink-26 (26.7): the practitioner's week, the three clinics in one view (Stitch design, real data only). The API is
// mocked at the feature's api.ts; "now" is fixed and every date is a Tunis date, so the tests hold in any time zone.
vi.mock('../api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
const fetchAgenda = vi.mocked(api.fetchAgenda)

/** Wednesday 11 November 2026, 10:00 in Tunis. */
const NOW = new Date('2026-11-11T09:00:00Z')

const SOUSSE = { id: 'c1', name: 'Clinique MedLink Sousse' }
const SFAX = { id: 'c2', name: 'Clinique MedLink Sfax' }
const TUNIS = { id: 'c3', name: 'Clinique MedLink Tunis' }

/** A 30-minute slot; `startsAt` in UTC (Tunis is UTC+1). */
function slot(id: string, startsAt: string, clinic = SOUSSE, status: AgendaItem['status'] = 'OPEN'): AgendaItem {
  return { slotId: id, status, startsAt, endsAt: new Date(Date.parse(startsAt) + 30 * 60_000).toISOString(), clinic }
}

const BOOKED: AgendaItem = {
  ...slot('s2', '2026-11-10T09:00:00Z', SFAX, 'BOOKED'),
  appointment: { id: 'a1', status: 'BOOKED', patient: { id: 'p1', firstName: 'Ahmed', lastName: 'Kacem' } },
}

const WEEK: Agenda = {
  clinics: [SOUSSE, SFAX, TUNIS],
  items: [
    slot('s1', '2026-11-09T08:00:00Z', SOUSSE), // Monday 09:00
    BOOKED, // Tuesday 10:00
    slot('s3', '2026-11-12T13:00:00Z', TUNIS, 'CLOSED'), // Thursday 14:00
  ],
}

const TITLE = 'Semaine du 9 au 14 novembre 2026'

function renderPage() {
  return render(
    <MemoryRouter>
      <AgendaPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  fetchAgenda.mockResolvedValue(WEEK)
})

afterEach(() => {
  vi.useRealTimers()
})

test('shows the current week of the three clinics in one table, each slot in its day and hour', async () => {
  renderPage()

  expect(await screen.findByRole('heading', { name: TITLE })).toBeInTheDocument()
  expect(screen.getByText('Semaine 46 • Fuseau GMT+1 (Tunis)')).toBeInTheDocument()
  // Monday 00:00 to Sunday 00:00, Tunis time
  expect(fetchAgenda).toHaveBeenCalledWith('2026-11-08T23:00:00.000Z', '2026-11-14T23:00:00.000Z')
  const table = screen.getByRole('table', { name: TITLE })
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
    'Heure',
    expect.stringContaining('LUN9'),
    expect.stringContaining('MAR10'),
    expect.stringContaining('MER11'),
    expect.stringContaining('JEU12'),
    expect.stringContaining('VEN13'),
    expect.stringContaining('SAM14'),
  ])
  expect(within(table).getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(['09:00', '10:00', '14:00'])
  expect(screen.getByRole('listitem', { name: 'lundi 9 novembre, 09:00 – 09:30, Clinique MedLink Sousse, disponible' })).toBeInTheDocument()
  expect(screen.getByRole('listitem', { name: 'mardi 10 novembre, 10:00 – 10:30, Clinique MedLink Sfax, réservé, Ahmed Kacem' })).toBeInTheDocument()
  expect(screen.getByRole('listitem', { name: 'jeudi 12 novembre, 14:00 – 14:30, Clinique MedLink Tunis, fermé' })).toBeInTheDocument()
})

test('a booked slot shows the patient names and nothing more; an open one invites, a closed one says so', async () => {
  renderPage()

  const booked = await screen.findByRole('listitem', { name: /réservé/ })
  expect(within(booked).getByText('Ahmed K.')).toBeInTheDocument() // short on the card (Stitch design)
  expect(booked).toHaveAccessibleName(/Ahmed Kacem/) // whole for screen readers
  expect(within(booked).getByText('Rendez-vous confirmé')).toBeInTheDocument()
  expect(within(screen.getByRole('listitem', { name: /disponible/ })).getByText('Créneau disponible')).toBeInTheDocument()
  expect(within(screen.getByRole('listitem', { name: /fermé/ })).getByText('Créneau fermé')).toBeInTheDocument()
})

test('today is marked, with its clinic', async () => {
  renderPage()

  const today = await screen.findByRole('columnheader', { name: /MER/ })
  expect(today).toHaveAttribute('aria-current', 'date')
  expect(today).toHaveTextContent('Ce jour')
  expect(screen.getByRole('columnheader', { name: /LUN/ })).not.toHaveAttribute('aria-current')
})

test('the sites of the week say which clinic on which days', async () => {
  renderPage()

  const sites = await screen.findByRole('list', { name: 'Sites de présence' })
  expect(within(sites).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Sfax (mardi)',
    'Sousse (lundi)',
    'Tunis (jeudi)',
  ])
})

test('the legend names each clinic next to its colour, and the slot states', async () => {
  renderPage()

  const legend = await screen.findByRole('list', { name: 'Légende' })
  expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Sfax',
    'Sousse',
    'Tunis',
    'Rendez-vous confirmé',
    'Créneau disponible',
    'Créneau fermé',
  ])
})

test('the clinic filter shows some clinics or all of them', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { name: TITLE })

  expect(screen.getByRole('checkbox', { name: /Sousse/ })).toBeChecked()
  await user.click(screen.getByRole('checkbox', { name: /Sousse/ }))
  await user.click(screen.getByRole('checkbox', { name: /Tunis/ }))

  expect(screen.getByRole('listitem', { name: /Clinique MedLink Sfax/ })).toBeInTheDocument()
  expect(screen.queryByRole('listitem', { name: /Clinique MedLink Sousse/ })).toBeNull()
  expect(screen.queryByRole('listitem', { name: /Clinique MedLink Tunis/ })).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Tout cocher' }))

  expect(screen.getAllByRole('listitem', { name: /novembre/ })).toHaveLength(3)
})

test('the previous and next buttons move a week, "Aujourd’hui" comes back', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { name: TITLE })

  await user.click(screen.getByRole('button', { name: 'Semaine suivante' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 16 au 21 novembre 2026' })).toBeInTheDocument()
  expect(fetchAgenda).toHaveBeenLastCalledWith('2026-11-15T23:00:00.000Z', '2026-11-21T23:00:00.000Z')

  await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
  await user.click(screen.getByRole('button', { name: 'Semaine précédente' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 2 au 7 novembre 2026' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Aujourd’hui' }))
  expect(await screen.findByRole('heading', { name: TITLE })).toBeInTheDocument()
})

test('the month calendar opens the week of the day clicked, and moves by month', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { name: TITLE })
  const calendar = screen.getByRole('region', { name: 'Novembre 2026' })

  await user.click(within(calendar).getByRole('button', { name: 'mercredi 18 novembre' }))
  expect(await screen.findByRole('heading', { name: 'Semaine du 16 au 21 novembre 2026' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
  expect(screen.getByRole('region', { name: 'Décembre 2026' })).toBeInTheDocument()
})

test('says it is loading, then shows the week', async () => {
  let answer: (agenda: Agenda) => void = () => {}
  fetchAgenda.mockReturnValue(new Promise((resolve) => (answer = resolve)))
  renderPage()

  expect(screen.getByRole('status')).toHaveTextContent('Chargement de l’agenda…')
  answer(WEEK)
  expect(await screen.findByRole('table', { name: TITLE })).toBeInTheDocument()
})

test('a week without any slot says so', async () => {
  fetchAgenda.mockResolvedValue({ clinics: [SOUSSE, SFAX, TUNIS], items: [] })
  renderPage()

  expect(await screen.findByText('Aucun créneau cette semaine')).toBeInTheDocument()
})

test('an error shows the API message and a way to try again', async () => {
  const user = userEvent.setup()
  fetchAgenda.mockRejectedValueOnce(
    new ApiError(409, 'PRACTITIONER_PROFILE_MISSING', 'Votre profil praticien n’est pas encore configuré.'),
  )
  renderPage()

  expect(await screen.findByRole('alert')).toHaveTextContent('Votre profil praticien n’est pas encore configuré.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('table', { name: TITLE })).toBeInTheDocument()
})

test('the weekly occupancy counts booked slots among the bookable ones', async () => {
  renderPage()

  const occupancy = await screen.findByRole('region', { name: 'Taux d’occupation hebdo' })
  // 1 booked out of 2 bookable (open or booked); a closed slot does not count
  expect(within(occupancy).getByText('50 %')).toBeInTheDocument()
  expect(within(occupancy).getByText('1 rendez-vous fixé')).toBeInTheDocument()
  expect(within(occupancy).getByText('1 disponible')).toBeInTheDocument()
})
