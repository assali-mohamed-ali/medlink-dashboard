import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import ProfilePage from './ProfilePage'

// Practitioner profile (after the Stitch "Profil & Paramètres de Sécurité" design): what the API knows only, read-only
// (no route edits a profile yet), and the way to the change-password page.
const logout = vi.fn()
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'generaliste@medlink.local', firstName: 'Mehdi', lastName: 'Ben Salem', roles: ['PRACTITIONER'] },
    logout,
  }),
}))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  fetchWeek: vi.fn(),
}))
const fetchAgenda = vi.mocked(api.fetchWeek)

const SOUSSE = { id: 'c1', name: 'Clinique MedLink Sousse' }
const TUNIS = { id: 'c3', name: 'Clinique MedLink Tunis' }

function slot(id: string, status: 'OPEN' | 'BOOKED' | 'CLOSED', clinic = SOUSSE) {
  return { slotId: id, status, startsAt: '2026-11-12T08:00:00Z', endsAt: '2026-11-12T08:30:00Z', clinic }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/praticien/profil']}>
      <Routes>
        <Route path="/praticien/profil" element={<ProfilePage />} />
        <Route path="/praticien/mot-de-passe" element={<h2>Page mot de passe</h2>} />
        <Route path="/connexion" element={<h2>Connexion</h2>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-11T09:00:00Z'))
  fetchAgenda.mockResolvedValue({
    clinics: [SOUSSE, TUNIS],
    items: [slot('s1', 'BOOKED'), slot('s2', 'BOOKED', TUNIS), slot('s3', 'OPEN'), slot('s4', 'CLOSED')],
  })
  logout.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

test('the header says who is logged in: the name, the role, the second step and the e-mail', async () => {
  renderPage()

  const header = screen.getByRole('region', { name: 'Mon profil' })
  expect(within(header).getByRole('heading', { name: 'Mehdi Ben Salem', level: 2 })).toBeInTheDocument()
  expect(within(header).getByText('Praticien')).toBeInTheDocument()
  expect(within(header).getByText('Connexion en deux étapes activée')).toBeInTheDocument()
  expect(within(header).getByText('generaliste@medlink.local')).toBeInTheDocument()
  await screen.findByRole('list', { name: 'Votre activité' })
})

test('the account information is shown as text, not as fields, and says how to change it', async () => {
  renderPage()

  const account = screen.getByRole('region', { name: 'Informations du compte' })
  expect(account).toHaveTextContent('Nom completMehdi Ben Salem')
  expect(account).toHaveTextContent('Adresse e-mailgeneraliste@medlink.local')
  expect(account).toHaveTextContent('RôlePraticien')
  expect(within(account).queryAllByRole('textbox')).toHaveLength(0)
  expect(within(account).getByText(/ne se modifient pas ici/)).toBeInTheDocument()
  expect(within(account).getByText(/contactez l’administration de votre clinique/)).toBeInTheDocument()
  expect(within(account).queryByRole('button', { name: /Enregistrer/ })).toBeNull()
  await screen.findByRole('list', { name: 'Votre activité' })
})

test('the clinics and this week’s activity come from the agenda (current week, Tunis time)', async () => {
  renderPage()

  expect(fetchAgenda).toHaveBeenCalledExactlyOnceWith('2026-11-08T23:00:00.000Z', '2026-11-14T23:00:00.000Z')
  const clinics = await screen.findByRole('list', { name: 'Cliniques de rattachement' })
  const items = within(clinics).getAllByRole('listitem')
  expect(items.map((item) => item.textContent)).toEqual(['Clinique MedLink Sousse', 'Clinique MedLink Tunis'])
  // The agenda's colours: one per clinic, in the order of their names
  expect(items.map((item) => item.getAttribute('data-tone'))).toEqual(['1', '2'])
  const stats = screen.getByRole('list', { name: 'Votre activité' })
  expect(within(stats).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    '2Cliniques',
    '2Rendez-vous cette semaine',
    '1Créneau disponible',
  ])
})

test('one security card: the second step, the password and the session, nothing it cannot prove', async () => {
  renderPage()

  const security = screen.getByRole('region', { name: 'Sécurité' })
  const second = within(security).getByRole('listitem', { name: 'Connexion en deux étapes' })
  expect(within(second).getByText(/code à 6 chiffres/)).toBeInTheDocument()
  expect(within(second).getByText('Activée')).toBeInTheDocument()
  const password = within(security).getByRole('listitem', { name: 'Mot de passe' })
  expect(within(password).getByText('12 caractères ou plus')).toBeInTheDocument()
  expect(within(password).getByText(/3 derniers/)).toBeInTheDocument()
  const session = within(security).getByRole('listitem', { name: 'Session' })
  expect(within(session).getByText(/15 minutes d’inactivité/)).toBeInTheDocument()
  // No invented figure or certification
  expect(screen.queryByText(/SHA-256|ISO|ANSI|IP :/)).toBeNull()
  await screen.findByRole('list', { name: 'Votre activité' })
})

test('"Modifier le mot de passe" leads to the change-password page of the space', async () => {
  const user = userEvent.setup()
  renderPage()

  const security = screen.getByRole('region', { name: 'Sécurité' })
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

test('an agenda that cannot be read leaves the rest of the profile usable', async () => {
  fetchAgenda.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderPage()

  expect(await screen.findByText(/Vos cliniques n’ont pas pu être chargées/)).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Informations du compte' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Modifier le mot de passe' })).toBeInTheDocument()
})
