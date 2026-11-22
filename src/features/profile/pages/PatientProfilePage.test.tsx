import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import PatientProfilePage from './PatientProfilePage'

// The patient's profile, like the practitioner's: who is logged in, the account as text (no route edits it yet), the
// counts of their appointments, and one security card with the way to the password page. Only what the API knows: a
// patient has no second step at login, so the page never says one is on.
const logout = vi.fn()
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'amel@example.com', firstName: 'Amel', lastName: 'Ben Salah', roles: ['PATIENT'] },
    logout,
  }),
}))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  fetchMyAppointments: vi.fn(),
}))
const fetchMyAppointments = vi.mocked(api.fetchMyAppointments)

/** Wednesday 11 November 2026, 10:00, local time. */
const NOW = new Date(2026, 10, 11, 10, 0)

function appointment(id: string, start: Date, status = 'BOOKED') {
  return { id, status, startsAt: start.toISOString() }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patient/profil']}>
      <Routes>
        <Route path="/patient/profil" element={<PatientProfilePage />} />
        <Route path="/patient/mot-de-passe" element={<h2>Page mot de passe</h2>} />
        <Route path="/connexion" element={<h2>Connexion</h2>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  fetchMyAppointments.mockResolvedValue({
    items: [
      appointment('a1', new Date(2026, 10, 13, 9, 0)),
      appointment('a2', new Date(2026, 10, 12, 14, 0), 'CANCELLED'),
      appointment('a3', new Date(2026, 10, 2, 8, 30)),
    ],
    total: 3,
  })
  logout.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

test('the header says who is logged in: the name, the role and the e-mail, no second step it cannot prove', async () => {
  renderPage()

  const header = screen.getByRole('region', { name: 'Mon profil' })
  expect(within(header).getByRole('heading', { name: 'Amel Ben Salah', level: 2 })).toBeInTheDocument()
  expect(within(header).getByText('Patient')).toBeInTheDocument()
  expect(within(header).getByText('amel@example.com')).toBeInTheDocument()
  expect(screen.queryByText(/deux étapes/)).toBeNull()
  await screen.findByRole('list', { name: 'Vos rendez-vous' })
})

test('the account information is shown as text, not as fields, and says how to change it', async () => {
  renderPage()

  const account = screen.getByRole('region', { name: 'Informations du compte' })
  expect(account).toHaveTextContent('Nom completAmel Ben Salah')
  expect(account).toHaveTextContent('Adresse e-mailamel@example.com')
  expect(account).toHaveTextContent('RôlePatient')
  expect(within(account).queryAllByRole('textbox')).toHaveLength(0)
  expect(within(account).getByText(/ne se modifient pas ici/)).toBeInTheDocument()
  expect(within(account).getByText(/contactez l’accueil de votre clinique/)).toBeInTheDocument()
  await screen.findByRole('list', { name: 'Vos rendez-vous' })
})

test('the counts of the patient’s appointments: to come, cancelled, past', async () => {
  renderPage()

  const counts = await screen.findByRole('list', { name: 'Vos rendez-vous' })
  expect(fetchMyAppointments).toHaveBeenCalledExactlyOnceWith(0, 50)
  expect(within(counts).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    '1À venir',
    '1Annulé',
    '1Passé',
  ])
})

test('one security card: the password and the session, with the way to the password page of the space', async () => {
  const user = userEvent.setup()
  renderPage()

  const security = screen.getByRole('region', { name: 'Sécurité' })
  const password = within(security).getByRole('listitem', { name: 'Mot de passe' })
  expect(within(password).getByText('12 caractères ou plus')).toBeInTheDocument()
  expect(within(security).getByRole('listitem', { name: 'Session' })).toHaveTextContent(/15 minutes d’inactivité/)
  expect(within(security).queryByRole('listitem', { name: 'Connexion en deux étapes' })).toBeNull()

  await user.click(within(security).getByRole('link', { name: 'Modifier le mot de passe' }))
  expect(screen.getByRole('heading', { name: 'Page mot de passe' })).toBeInTheDocument()
})

test('"Se déconnecter" ends the session and goes to the login page', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(within(screen.getByRole('region', { name: 'Sécurité' })).getByRole('button', { name: 'Se déconnecter' }))

  expect(logout).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
})

test('appointments that cannot be read leave the rest of the profile usable', async () => {
  fetchMyAppointments.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderPage()

  expect(await screen.findByText(/Vos rendez-vous n’ont pas pu être comptés/)).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Informations du compte' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Modifier le mot de passe' })).toBeInTheDocument()
})
