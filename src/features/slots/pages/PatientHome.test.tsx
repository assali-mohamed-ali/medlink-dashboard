import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Appointment } from '../types'
import PatientHome from './PatientHome'

// The patient's home (Stitch design): the greeting with today's date, the next appointment with its actions, the two
// quick actions, and what is not built yet said plainly. Only the API's appointments, never fake data. Times are built
// in local time, so the tests hold in any time zone.
vi.mock('../api', () => ({ fetchMyAppointments: vi.fn(), cancelAppointment: vi.fn() }))
const fetchMyAppointments = vi.mocked(api.fetchMyAppointments)
const cancelAppointment = vi.mocked(api.cancelAppointment)

/** Wednesday 11 November 2026, 10:00, local time. */
const NOW = new Date(2026, 10, 11, 10, 0)

function appointment(id: string, start: Date, status = 'BOOKED', who = 'Rim Jaziri'): Appointment {
  const [firstName, lastName] = who.split(' ')
  return {
    id,
    status,
    clinic: { id: 'c2', name: 'Clinique MedLink Sfax' },
    practitioner: { id: 'p2', firstName, lastName },
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 30 * 60_000).toISOString(),
  }
}

const NEXT = appointment('a1', new Date(2026, 10, 13, 9, 0))
const LATER = appointment('a2', new Date(2026, 10, 14, 11, 0), 'BOOKED', 'Omar Gharbi')
const CANCELLED = appointment('a3', new Date(2026, 10, 12, 14, 0), 'CANCELLED')
const PAST = appointment('a4', new Date(2026, 10, 2, 8, 30))

function renderHome() {
  return render(
    <MemoryRouter>
      <PatientHome firstName="Amel" />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  // The API gives the latest first
  fetchMyAppointments.mockResolvedValue({ items: [LATER, NEXT, CANCELLED, PAST], total: 4 })
})

afterEach(() => {
  vi.useRealTimers()
})

test('greets the patient by name, with today’s date', async () => {
  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: 'Bonjour Amel' })).toBeInTheDocument()
  expect(screen.getByText('mercredi 11 novembre 2026')).toBeInTheDocument()
  await screen.findByRole('region', { name: 'Prochain rendez-vous' })
})

test('says when the next appointment is, and shows it: practitioner, time, clinic, how soon', async () => {
  renderHome()

  expect(await screen.findByText(/Votre prochain rendez-vous est/)).toHaveTextContent(
    'Votre prochain rendez-vous est le vendredi 13 novembre à 09:00.',
  )
  const next = screen.getByRole('region', { name: 'Prochain rendez-vous' })
  expect(within(next).getByText('Dr Rim Jaziri')).toBeInTheDocument()
  expect(within(next).getByText('09:00 – 09:30')).toBeInTheDocument()
  expect(within(next).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  expect(within(next).getByText('Dans 2 jours')).toBeInTheDocument()
  // The one after it, in one line
  expect(within(next).getByText(/Ensuite/)).toHaveTextContent('Ensuite : samedi 14 novembre · 11:00 avec Dr Omar Gharbi')
})

test('an appointment tomorrow says "demain"', async () => {
  fetchMyAppointments.mockResolvedValue({ items: [appointment('a5', new Date(2026, 10, 12, 8, 0))], total: 1 })
  renderHome()

  expect(await screen.findByText(/Votre prochain rendez-vous est/)).toHaveTextContent(
    'Votre prochain rendez-vous est demain à 08:00.',
  )
  expect(within(screen.getByRole('region', { name: 'Prochain rendez-vous' })).getByText('Demain')).toBeInTheDocument()
})

test('the two quick actions: book a slot, and my appointments with how many are to come', async () => {
  renderHome()
  await screen.findByRole('region', { name: 'Prochain rendez-vous' })

  expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', '/patient/creneaux')
  const mine = screen.getByRole('link', { name: /^Mes rendez-vous/ })
  expect(mine).toHaveAttribute('href', '/patient/rendez-vous')
  expect(mine).toHaveTextContent('2 à venir')
  expect(screen.getByRole('link', { name: 'Voir tous mes rendez-vous' })).toHaveAttribute('href', '/patient/rendez-vous')
})

test('"Reporter" opens the slot search to move the next appointment', async () => {
  renderHome()

  const next = await screen.findByRole('region', { name: 'Prochain rendez-vous' })
  expect(within(next).getByRole('link', { name: 'Reporter' })).toHaveAttribute('href', '/patient/creneaux?reporter=a1')
})

test('"Annuler" asks to confirm, cancels the next appointment and reads the list again', async () => {
  const user = userEvent.setup()
  cancelAppointment.mockResolvedValue(undefined)
  renderHome()
  const next = await screen.findByRole('region', { name: 'Prochain rendez-vous' })

  await user.click(within(next).getByRole('button', { name: 'Annuler' }))
  const dialog = screen.getByRole('dialog', { name: 'Annuler ce rendez-vous ?' })
  expect(within(dialog).getByText('vendredi 13 novembre 2026')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: 'Confirmer l’annulation' }))

  expect(cancelAppointment).toHaveBeenCalledExactlyOnceWith('a1')
  expect(await screen.findByText(/Votre rendez-vous est annulé/)).toBeInTheDocument()
  expect(fetchMyAppointments).toHaveBeenCalledTimes(2)
})

test('no appointment to come: says so, with nothing to count', async () => {
  fetchMyAppointments.mockResolvedValue({ items: [CANCELLED, PAST], total: 2 })
  renderHome()

  expect(await screen.findByText('Vous n’avez pas de rendez-vous prévu.')).toBeInTheDocument()
  const next = screen.getByRole('region', { name: 'Prochain rendez-vous' })
  expect(within(next).getByText('Aucun rendez-vous à venir.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /^Mes rendez-vous/ })).not.toHaveTextContent('à venir')
})

test('the list that cannot be read says so; the quick actions stay', async () => {
  fetchMyAppointments.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderHome()

  expect(await screen.findByRole('alert')).toHaveTextContent('Connexion impossible.')
  expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toBeInTheDocument()
})

test('the consultation reports lead to their page; messages are not built yet and say so, with no link', async () => {
  renderHome()
  await screen.findByRole('region', { name: 'Prochain rendez-vous' })

  const reports = screen.getByRole('region', { name: 'Comptes-rendus' })
  expect(within(reports).getByRole('link', { name: 'Voir mes comptes-rendus' })).toHaveAttribute(
    'href',
    '/patient/comptes-rendus',
  )
  expect(within(reports).queryByText('Bientôt disponible')).toBeNull()
  const messages = screen.getByRole('region', { name: 'Messages' })
  expect(within(messages).getByText('Bientôt disponible')).toBeInTheDocument()
  expect(within(messages).queryByRole('link')).toBeNull()
})
