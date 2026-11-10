import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Agenda, AgendaItem } from '../types'
import AgendaPage from './AgendaPage'

// MLink-26 (26.8): open a slot, close a free one, reopen a closed one, from the agenda. The API is mocked at the
// feature's api.ts; "now" is fixed (Wednesday 11 November 2026, 10:00 in Tunis) and every time typed is Tunis time.
vi.mock('../api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'mehdi@example.com', firstName: 'Mehdi', lastName: 'Ben Salem', roles: ['PRACTITIONER'] } }),
}))
const fetchAgenda = vi.mocked(api.fetchAgenda)
const openSlot = vi.mocked(api.openSlot)
const changeSlotStatus = vi.mocked(api.changeSlotStatus)

const NOW = new Date('2026-11-11T09:00:00Z')
const SOUSSE = { id: 'c1', name: 'Clinique MedLink Sousse' }
const SFAX = { id: 'c2', name: 'Clinique MedLink Sfax' }

function slot(id: string, startsAt: string, clinic = SOUSSE, status: AgendaItem['status'] = 'OPEN'): AgendaItem {
  return { slotId: id, status, startsAt, endsAt: new Date(Date.parse(startsAt) + 30 * 60_000).toISOString(), clinic }
}

const WEEK: Agenda = {
  clinics: [SOUSSE, SFAX],
  items: [
    slot('past', '2026-11-09T08:00:00Z'), // Monday 09:00: over, nothing to change
    {
      ...slot('booked', '2026-11-12T08:00:00Z', SFAX, 'BOOKED'), // Thursday 09:00
      appointment: { id: 'a1', status: 'BOOKED', patient: { id: 'p1', firstName: 'Ahmed', lastName: 'Kacem' } },
    },
    slot('free', '2026-11-13T08:00:00Z'), // Friday 09:00
    slot('closed', '2026-11-13T13:00:00Z', SFAX, 'CLOSED'), // Friday 14:00
  ],
}

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

async function openForm() {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('table')
  await user.click(screen.getByRole('button', { name: /Ajouter un créneau/ }))
  return { user, form: screen.getByRole('form', { name: 'Ouvrir un créneau' }) }
}

async function fill(user: ReturnType<typeof userEvent.setup>, form: HTMLElement, values: { date?: string; start?: string; end?: string; clinic?: string }) {
  if (values.clinic) await user.selectOptions(within(form).getByLabelText('Clinique'), values.clinic)
  for (const [label, value] of [['Date', values.date], ['Début', values.start], ['Fin', values.end]] as const) {
    if (value === undefined) continue
    const field = within(form).getByLabelText(label)
    await user.clear(field)
    await user.type(field, value)
  }
}

test('the yellow action opens the form: the practitioner’s clinics, a date, a start and an end in Tunis time', async () => {
  const { form } = await openForm()

  expect(screen.getByRole('button', { name: /Ajouter un créneau/ })).toHaveAttribute('aria-expanded', 'true')
  expect(within(form).getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Choisissez une clinique',
    'Clinique MedLink Sfax',
    'Clinique MedLink Sousse',
  ])
  expect(within(form).getByLabelText('Date')).toHaveValue('2026-11-11') // today
  expect(within(form).getByText(/Heure de Tunis/)).toBeInTheDocument()
})

test('opening a slot sends Tunis times as instants, then says so, closes the form and shows its week again', async () => {
  openSlot.mockResolvedValue(slot('new', '2026-11-20T08:00:00Z', SFAX))
  const { user, form } = await openForm()

  await fill(user, form, { clinic: 'c2', date: '2026-11-20', start: '09:00', end: '09:30' })
  await user.click(within(form).getByRole('button', { name: 'Ouvrir le créneau' }))

  expect(openSlot).toHaveBeenCalledExactlyOnceWith({
    clinicId: 'c2',
    startsAt: '2026-11-20T08:00:00.000Z',
    endsAt: '2026-11-20T08:30:00.000Z',
  })
  expect(await screen.findByText('Créneau ouvert : vendredi 20 novembre, 09:00 – 09:30, Clinique MedLink Sfax.')).toBeInTheDocument()
  expect(screen.queryByRole('form', { name: 'Ouvrir un créneau' })).toBeNull()
  // The week of the new slot, read again from the API
  expect(await screen.findByRole('heading', { name: 'Semaine du 16 au 21 novembre 2026' })).toBeInTheDocument()
  expect(fetchAgenda).toHaveBeenLastCalledWith('2026-11-15T23:00:00.000Z', '2026-11-21T23:00:00.000Z')
})

test('a double click sends the slot once', async () => {
  openSlot.mockReturnValue(new Promise(() => {}))
  const { user, form } = await openForm()

  await fill(user, form, { clinic: 'c1', start: '15:00', end: '15:30' })
  await user.dblClick(within(form).getByRole('button', { name: /Ouvrir le créneau/ }))

  expect(openSlot).toHaveBeenCalledTimes(1)
  expect(within(form).getByRole('button', { name: /Ouvrir le créneau/ })).toBeDisabled()
})

test('the form checks what it can before sending: every field, and an end after the start', async () => {
  const { user, form } = await openForm()

  await user.click(within(form).getByRole('button', { name: 'Ouvrir le créneau' }))
  expect(within(form).getByText('Choisissez une clinique.')).toBeInTheDocument()
  expect(within(form).getByText('Indiquez l’heure de début.')).toBeInTheDocument()
  expect(within(form).getByText('Indiquez l’heure de fin.')).toBeInTheDocument()

  await fill(user, form, { clinic: 'c1', start: '15:00', end: '14:30' })
  await user.click(within(form).getByRole('button', { name: 'Ouvrir le créneau' }))
  expect(within(form).getByText('La fin doit être après le début.')).toBeInTheDocument()
  expect(within(form).getByLabelText('Fin')).toHaveAttribute('aria-invalid', 'true')
  expect(openSlot).not.toHaveBeenCalled()
})

test('an overlap (409 SLOT_OVERLAP) shows the API message and keeps what was typed', async () => {
  openSlot.mockRejectedValue(
    new ApiError(409, 'SLOT_OVERLAP', 'Vous avez déjà un créneau de 09:00 à 09:30 à Clinique MedLink Sousse le 13/11/2026.'),
  )
  const { user, form } = await openForm()

  await fill(user, form, { clinic: 'c2', date: '2026-11-13', start: '09:00', end: '09:30' })
  await user.click(within(form).getByRole('button', { name: 'Ouvrir le créneau' }))

  expect(await within(form).findByRole('alert')).toHaveTextContent('Vous avez déjà un créneau de 09:00 à 09:30')
  expect(within(form).getByLabelText('Début')).toHaveValue('09:00')
  expect(within(form).getByRole('button', { name: 'Ouvrir le créneau' })).toBeEnabled()
})

test('a 400 puts each API message under its own field', async () => {
  openSlot.mockRejectedValue(
    new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', {
      clinicId: 'Choisissez l’une de vos cliniques.',
      startsAt: 'Le début doit être dans le futur.',
      endsAt: 'Un créneau dure au moins 10 minutes.',
    }),
  )
  const { user, form } = await openForm()

  await fill(user, form, { clinic: 'c1', start: '08:00', end: '08:05' })
  await user.click(within(form).getByRole('button', { name: 'Ouvrir le créneau' }))

  expect(await within(form).findByText('Le début doit être dans le futur.')).toBeInTheDocument()
  expect(within(form).getByLabelText('Début')).toHaveAttribute('aria-invalid', 'true')
  expect(within(form).getByLabelText('Fin')).toHaveAccessibleDescription('Un créneau dure au moins 10 minutes.')
  expect(within(form).getByLabelText('Clinique')).toHaveAccessibleDescription('Choisissez l’une de vos cliniques.')
})

test('"Annuler" closes the form without sending anything', async () => {
  const { user, form } = await openForm()

  await user.click(within(form).getByRole('button', { name: 'Annuler' }))

  expect(screen.queryByRole('form', { name: 'Ouvrir un créneau' })).toBeNull()
  expect(screen.getByRole('button', { name: /Ajouter un créneau/ })).toHaveFocus()
  expect(openSlot).not.toHaveBeenCalled()
})

test('a free slot to come can be closed; the agenda is read again', async () => {
  changeSlotStatus.mockResolvedValue({ ...slot('free', '2026-11-13T08:00:00Z'), status: 'CLOSED' })
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Fermer le créneau du vendredi 13 novembre, 09:00 – 09:30' }))

  expect(changeSlotStatus).toHaveBeenCalledExactlyOnceWith('free', 'CLOSED')
  expect(await screen.findByText('Créneau fermé : vendredi 13 novembre, 09:00 – 09:30.')).toBeInTheDocument()
  expect(fetchAgenda).toHaveBeenCalledTimes(2)
})

test('a closed slot to come can be reopened', async () => {
  changeSlotStatus.mockResolvedValue({ ...slot('closed', '2026-11-13T13:00:00Z', SFAX), status: 'OPEN' })
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Rouvrir le créneau du vendredi 13 novembre, 14:00 – 14:30' }))

  expect(changeSlotStatus).toHaveBeenCalledExactlyOnceWith('closed', 'OPEN')
  expect(await screen.findByText('Créneau rouvert : vendredi 13 novembre, 14:00 – 14:30.')).toBeInTheDocument()
})

test('a booked slot and a slot already over offer no action', async () => {
  renderPage()
  await screen.findByRole('table')

  expect(within(screen.getByRole('listitem', { name: /réservé/ })).queryByRole('button')).toBeNull()
  expect(screen.queryByRole('button', { name: /créneau du lundi 9 novembre/ })).toBeNull()
  expect(screen.getAllByRole('button', { name: /(Fermer|Rouvrir) le créneau/ })).toHaveLength(2)
})

test('a slot booked meanwhile (409 SLOT_BOOKED) says so and the agenda is read again', async () => {
  changeSlotStatus.mockRejectedValue(
    new ApiError(409, 'SLOT_BOOKED', 'Ce créneau est réservé par un patient : il ne peut pas être modifié.'),
  )
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: /Fermer le créneau/ }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Ce créneau est réservé par un patient')
  await waitFor(() => expect(fetchAgenda).toHaveBeenCalledTimes(2))
})

test('a slot that is not theirs (403) gets a French message, not the raw error', async () => {
  changeSlotStatus.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Access Denied'))
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: /Rouvrir le créneau/ }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Ce créneau ne fait pas partie de votre agenda.')
})

test('a second click while the change is sent does nothing', async () => {
  changeSlotStatus.mockReturnValue(new Promise(() => {}))
  const user = userEvent.setup()
  renderPage()

  await user.dblClick(await screen.findByRole('button', { name: /Fermer le créneau/ }))

  expect(changeSlotStatus).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: /Fermer le créneau/ })).toBeDisabled()
})
