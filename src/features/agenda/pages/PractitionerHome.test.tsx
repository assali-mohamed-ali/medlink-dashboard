import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Agenda, AgendaItem } from '../types'
import PractitionerHome from './PractitionerHome'

// The practitioner's home (Stitch design): the day at a glance from the agenda of the week, the next consultation, the
// patients of the day with their records, the counts of the week. Only the API's agenda, never fake data. "Now" is
// Wednesday 11 November 2026, 09:40 in Tunis (08:40 UTC); every time shown is Tunis time.
vi.mock('../api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
const fetchAgenda = vi.mocked(api.fetchAgenda)

const NOW = new Date('2026-11-11T08:40:00Z')
const SFAX = { id: 'c2', name: 'Clinique MedLink Sfax' }
const TUNIS = { id: 'c3', name: 'Clinique MedLink Tunis' }

function slot(id: string, startsAt: string, clinic = SFAX, status: AgendaItem['status'] = 'OPEN'): AgendaItem {
  return { slotId: id, status, startsAt, endsAt: new Date(Date.parse(startsAt) + 30 * 60_000).toISOString(), clinic }
}

function booked(id: string, startsAt: string, patient: [string, string, string], clinic = SFAX): AgendaItem {
  const [pid, firstName, lastName] = patient
  return { ...slot(id, startsAt, clinic, 'BOOKED'), appointment: { id: `a-${id}`, status: 'BOOKED', patient: { id: pid, firstName, lastName } } }
}

const WEEK: Agenda = {
  clinics: [SFAX, TUNIS],
  items: [
    booked('s1', '2026-11-11T07:30:00Z', ['p1', 'Sami', 'Trabelsi']), // 08:30, over
    {
      ...slot('s2', '2026-11-11T08:00:00Z'), // 09:00, cancelled (37.7): free again
      appointment: { id: 'a-x', status: 'CANCELLED', patient: { id: 'p9', firstName: 'Amel', lastName: 'Ben Salah' } },
    },
    booked('s3', '2026-11-11T09:00:00Z', ['p2', 'Ahmed', 'Kacem']), // 10:00, the next one
    slot('s4', '2026-11-11T10:00:00Z'), // 11:00, free
    slot('s5', '2026-11-11T13:00:00Z', TUNIS, 'CLOSED'), // 14:00, closed
    booked('s6', '2026-11-11T14:00:00Z', ['p3', 'Rim', 'Jaziri'], TUNIS), // 15:00
    booked('s7', '2026-11-13T09:00:00Z', ['p4', 'Omar', 'Gharbi']), // Friday
    slot('s8', '2026-11-13T10:00:00Z'), // Friday, free
  ],
}

function renderHome() {
  return render(
    <MemoryRouter>
      <PractitionerHome firstName="Mehdi" />
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

test('greets the practitioner with today’s date and reads the agenda of this week', async () => {
  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: 'Bonjour Mehdi' })).toBeInTheDocument()
  expect(screen.getByText('mercredi 11 novembre 2026')).toBeInTheDocument()
  await screen.findByRole('region', { name: 'Aujourd’hui' })
  // Monday 9 to Sunday 15 November, Tunis time
  expect(fetchAgenda).toHaveBeenCalledExactlyOnceWith('2026-11-08T23:00:00.000Z', '2026-11-14T23:00:00.000Z')
})

test('says how many consultations today and when the next one is', async () => {
  renderHome()

  expect(await screen.findByText(/Vous avez/)).toHaveTextContent(
    'Vous avez 3 consultations aujourd’hui, la prochaine à 10:00.',
  )
})

test('the next consultation first: patient, time, clinic, how soon, and its record', async () => {
  renderHome()

  const today = await screen.findByRole('region', { name: 'Aujourd’hui' })
  const next = within(today).getByRole('article', { name: 'Prochaine consultation' })
  expect(within(next).getByText('Ahmed Kacem')).toBeInTheDocument()
  expect(within(next).getByText('10:00 – 10:30')).toBeInTheDocument()
  expect(within(next).getByText('Clinique MedLink Sfax')).toBeInTheDocument()
  expect(within(next).getByText('Prochain · dans 20 min')).toBeInTheDocument()
  expect(within(next).getByRole('link', { name: 'Ouvrir le dossier de Ahmed Kacem' })).toHaveAttribute(
    'href',
    '/praticien/patients/p2',
  )
})

test('the rest of the day in order: done, cancelled (struck), free, closed, to come', async () => {
  renderHome()

  const today = await screen.findByRole('region', { name: 'Aujourd’hui' })
  const rows = within(within(today).getByRole('list', { name: 'Le reste de la journée' })).getAllByRole('listitem')
  expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
    '08:30 – 09:00, Sami Trabelsi, confirmé',
    '09:00 – 09:30, rendez-vous de Amel Ben Salah annulé, créneau de nouveau libre',
    '11:00 – 11:30, créneau disponible',
    '14:00 – 14:30, créneau fermé',
    '15:00 – 15:30, Rim Jaziri, confirmé',
  ])
  expect(rows[0]).toHaveAttribute('data-past', 'true')
  expect(within(rows[1]).getByText('Amel Ben Salah').tagName).toBe('S')
  expect(within(rows[4]).getByRole('link', { name: 'Ouvrir le dossier de Rim Jaziri' })).toHaveAttribute(
    'href',
    '/praticien/patients/p3',
  )
})

test('the counts of the week: appointments, free slots, occupancy', async () => {
  renderHome()

  const counts = await screen.findByRole('list', { name: 'Cette semaine' })
  expect(within(counts).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    '4Rendez-vous cette semaine',
    '3Créneaux libres',
    '57 %Occupation de la semaine',
  ])
})

test('the patients of the day, each with a link to their record', async () => {
  renderHome()

  const patients = await screen.findByRole('region', { name: 'Patients du jour' })
  const links = within(patients).getAllByRole('link')
  expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
    'Ouvrir le dossier de Sami Trabelsi',
    'Ouvrir le dossier de Ahmed Kacem',
    'Ouvrir le dossier de Rim Jaziri',
  ])
})

test('the quick actions: add a slot (the agenda with its form open) and open the agenda', async () => {
  renderHome()
  await screen.findByRole('region', { name: 'Aujourd’hui' })

  expect(screen.getByRole('link', { name: 'Ajouter un créneau' })).toHaveAttribute('href', '/praticien/agenda?ajouter')
  expect(screen.getByRole('link', { name: 'Ouvrir l’agenda' })).toHaveAttribute('href', '/praticien/agenda')
})

test('no consultation today: says so, and the day is empty', async () => {
  fetchAgenda.mockResolvedValue({ clinics: [SFAX], items: [booked('s7', '2026-11-13T09:00:00Z', ['p4', 'Omar', 'Gharbi'])] })
  renderHome()

  expect(await screen.findByText('Aucune consultation aujourd’hui.')).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: 'Aujourd’hui' })).getByText('Aucun créneau aujourd’hui.')).toBeInTheDocument()
})

test('the agenda that cannot be read says so; the quick actions stay', async () => {
  fetchAgenda.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderHome()

  expect(await screen.findByRole('alert')).toHaveTextContent('Connexion impossible.')
  expect(screen.getByRole('link', { name: 'Ouvrir l’agenda' })).toBeInTheDocument()
})

test('messages are not built yet: they say so, with no link', async () => {
  renderHome()
  const messages = await screen.findByRole('region', { name: 'Messages' })

  expect(within(messages).getByText('Bientôt disponible')).toBeInTheDocument()
  expect(within(messages).queryByRole('link')).toBeNull()
})
