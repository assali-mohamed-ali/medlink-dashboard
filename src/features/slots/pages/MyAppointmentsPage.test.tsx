import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Appointment } from '../types'
import MyAppointmentsPage from './MyAppointmentsPage'

// MLink-109: my appointments, with cancel and move. The API is mocked at the feature's api.ts; times are built in
// local time, so the tests hold in any time zone.
vi.mock('../api', () => ({ fetchMyAppointments: vi.fn(), cancelAppointment: vi.fn() }))
const fetchMyAppointments = vi.mocked(api.fetchMyAppointments)
const cancelAppointment = vi.mocked(api.cancelAppointment)

/** Wednesday 11 November 2026, 10:00, local time. */
const NOW = new Date(2026, 10, 11, 10, 0)

function appointment(id: string, start: Date, status = 'BOOKED'): Appointment {
  return {
    id,
    status,
    clinic: { id: 'c2', name: 'Clinique MedLink Sfax' },
    practitioner: { id: 'p2', firstName: 'Rim', lastName: 'Jaziri' },
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 30 * 60_000).toISOString(),
  }
}

const UPCOMING = appointment('a1', new Date(2026, 10, 13, 9, 0))
const CANCELLED = appointment('a2', new Date(2026, 10, 12, 14, 0), 'CANCELLED')
const PAST = appointment('a3', new Date(2026, 10, 2, 8, 30))

function renderPage() {
  return render(
    <MemoryRouter>
      <MyAppointmentsPage />
    </MemoryRouter>,
  )
}

/** The card of one appointment, by its date. */
function card(date: string) {
  return screen.getByRole('listitem', { name: `Rendez-vous du ${date}` })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  fetchMyAppointments.mockResolvedValue({ items: [UPCOMING, CANCELLED, PAST], total: 3 })
})

afterEach(() => {
  vi.useRealTimers()
})

test('lists my appointments with day, time, practitioner, clinic and a visible status', async () => {
  renderPage()

  expect(screen.getByRole('heading', { name: 'Mes rendez-vous' })).toBeInTheDocument()
  const upcoming = await screen.findByRole('listitem', { name: 'Rendez-vous du vendredi 13 novembre 2026' })
  expect(fetchMyAppointments).toHaveBeenCalledWith(0, 20)
  expect(within(upcoming).getByText('09:00 – 09:30')).toBeInTheDocument()
  expect(within(upcoming).getByText('Dr Rim Jaziri')).toBeInTheDocument()
  expect(within(upcoming).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  expect(within(upcoming).getByText('Confirmé')).toBeInTheDocument()
  expect(within(card('jeudi 12 novembre 2026')).getByText('Annulé')).toBeInTheDocument()
  expect(within(card('lundi 2 novembre 2026')).getByText('Passé')).toBeInTheDocument()
})

test('only an appointment still to come can be cancelled or moved', async () => {
  renderPage()
  const upcoming = await screen.findByRole('listitem', { name: 'Rendez-vous du vendredi 13 novembre 2026' })

  expect(within(upcoming).getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  expect(within(upcoming).getByRole('link', { name: 'Reporter' })).toHaveAttribute('href', '/patient/creneaux?reporter=a1')
  for (const date of ['jeudi 12 novembre 2026', 'lundi 2 novembre 2026']) {
    expect(within(card(date)).queryByRole('button', { name: 'Annuler' })).toBeNull()
    expect(within(card(date)).queryByRole('link', { name: 'Reporter' })).toBeNull()
  }
})

test('cancelling asks to confirm, then cancels and reloads the list', async () => {
  const user = userEvent.setup()
  cancelAppointment.mockResolvedValue(undefined)
  renderPage()
  const upcoming = await screen.findByRole('listitem', { name: 'Rendez-vous du vendredi 13 novembre 2026' })

  await user.click(within(upcoming).getByRole('button', { name: 'Annuler' }))
  const dialog = screen.getByRole('dialog', { name: 'Annuler ce rendez-vous ?' })
  expect(within(dialog).getByText('vendredi 13 novembre 2026')).toBeInTheDocument()
  expect(cancelAppointment).not.toHaveBeenCalled()
  await user.click(within(dialog).getByRole('button', { name: 'Confirmer l’annulation' }))

  expect(cancelAppointment).toHaveBeenCalledWith('a1')
  expect(await screen.findByText(/Votre rendez-vous est annulé/)).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(fetchMyAppointments).toHaveBeenCalledTimes(2)
})

test('"Garder mon rendez-vous" closes the confirmation and cancels nothing', async () => {
  const user = userEvent.setup()
  renderPage()
  const upcoming = await screen.findByRole('listitem', { name: 'Rendez-vous du vendredi 13 novembre 2026' })

  await user.click(within(upcoming).getByRole('button', { name: 'Annuler' }))
  await user.click(screen.getByRole('button', { name: 'Garder mon rendez-vous' }))

  expect(screen.queryByRole('dialog')).toBeNull()
  expect(cancelAppointment).not.toHaveBeenCalled()
})

test('422: the API message (deadline passed) stays in the confirmation', async () => {
  const user = userEvent.setup()
  cancelAppointment.mockRejectedValue(
    new ApiError(422, 'CANCEL_DEADLINE_PASSED', 'Ce rendez-vous ne peut plus être annulé moins de 12 heures avant son début.'),
  )
  renderPage()
  const upcoming = await screen.findByRole('listitem', { name: 'Rendez-vous du vendredi 13 novembre 2026' })
  await user.click(within(upcoming).getByRole('button', { name: 'Annuler' }))
  const dialog = screen.getByRole('dialog', { name: 'Annuler ce rendez-vous ?' })

  await user.click(within(dialog).getByRole('button', { name: 'Confirmer l’annulation' }))

  expect(
    await within(dialog).findByText('Ce rendez-vous ne peut plus être annulé moins de 12 heures avant son début.'),
  ).toHaveAttribute('role', 'alert')
})

test('no appointment yet: says so and offers to book one', async () => {
  fetchMyAppointments.mockResolvedValue({ items: [], total: 0 })

  renderPage()

  expect(await screen.findByText('Vous n’avez pas encore de rendez-vous.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', '/patient/creneaux')
})
