import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as agenda from '@/features/agenda'
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
vi.mock('@/features/agenda', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/agenda')>()),
  fetchAgenda: vi.fn(),
}))
const fetchAgenda = vi.mocked(agenda.fetchAgenda)

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

test('the identity card shows who is logged in, read-only, and says how to change it', async () => {
  renderPage()

  expect(screen.getByRole('heading', { name: 'Profil & sécurité', level: 2 })).toBeInTheDocument()
  const identity = screen.getByRole('region', { name: 'Mehdi Ben Salem' })
  expect(within(identity).getByText('Praticien')).toBeInTheDocument()
  expect(within(identity).getByLabelText('Nom complet')).toHaveValue('Mehdi Ben Salem')
  expect(within(identity).getByLabelText('Adresse e-mail')).toHaveValue('generaliste@medlink.local')
  expect(within(identity).getByLabelText('Nom complet')).toHaveAttribute('readonly')
  expect(within(identity).getByLabelText('Adresse e-mail')).toHaveAttribute('readonly')
  expect(within(identity).getByText(/contactez l’administration de votre clinique/)).toBeInTheDocument()
  expect(within(identity).queryByRole('button', { name: /Enregistrer/ })).toBeNull()
})

test('the clinics and this week’s activity come from the agenda (current week, Tunis time)', async () => {
  renderPage()

  expect(fetchAgenda).toHaveBeenCalledExactlyOnceWith('2026-11-08T23:00:00.000Z', '2026-11-14T23:00:00.000Z')
  const clinics = await screen.findByRole('list', { name: 'Cliniques de rattachement' })
  expect(within(clinics).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    'Clinique MedLink Sousse',
    'Clinique MedLink Tunis',
  ])
  const stats = screen.getByRole('list', { name: 'Votre activité' })
  expect(within(stats).getByText('2 cliniques')).toBeInTheDocument()
  expect(within(stats).getByText('2 rendez-vous cette semaine')).toBeInTheDocument()
  expect(within(stats).getByText('1 créneau disponible')).toBeInTheDocument()
})

test('the password card leads to the change-password page of the space', async () => {
  const user = userEvent.setup()
  renderPage()

  const password = screen.getByRole('region', { name: 'Mot de passe' })
  expect(within(password).getByText('12 caractères ou plus')).toBeInTheDocument()
  expect(within(password).getByText(/3 derniers mots de passe/)).toBeInTheDocument()
  await user.click(within(password).getByRole('link', { name: 'Modifier le mot de passe' }))

  expect(screen.getByRole('heading', { name: 'Page mot de passe' })).toBeInTheDocument()
})

test('the security card says what protects the account, nothing it cannot prove', async () => {
  renderPage()

  const security = screen.getByRole('region', { name: 'Sécurité du compte' })
  expect(within(security).getByText(/code à 6 chiffres/)).toBeInTheDocument()
  expect(within(security).getByText('Activée')).toBeInTheDocument()
  const session = screen.getByRole('region', { name: 'Session' })
  expect(within(session).getByText(/15 minutes d’inactivité/)).toBeInTheDocument()
  // No invented figure or certification
  expect(screen.queryByText(/SHA-256|ISO|ANSI|IP :/)).toBeNull()
})

test('"Se déconnecter" ends the session and goes to the login page', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(within(screen.getByRole('region', { name: 'Session' })).getByRole('button', { name: 'Se déconnecter' }))

  expect(logout).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
})

test('an agenda that cannot be read leaves the rest of the profile usable', async () => {
  fetchAgenda.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderPage()

  expect(await screen.findByText(/Vos cliniques n’ont pas pu être chargées/)).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Mehdi Ben Salem' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Modifier le mot de passe' })).toBeInTheDocument()
})
