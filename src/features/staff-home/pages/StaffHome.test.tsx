import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { AuditEntry, OverviewAccount, OverviewPractitioner } from '../types'
import StaffHome from './StaffHome'

// The staff's home (Stitch design, like the patient's and the practitioner's): the day, the network in figures, the
// latest audited actions and the accounts to watch. Only what the API gives the staff, never fake data.
vi.mock('../api', () => ({ fetchAccountsOverview: vi.fn(), fetchPractitioners: vi.fn(), fetchAuditEntries: vi.fn() }))
const fetchAccountsOverview = vi.mocked(api.fetchAccountsOverview)
const fetchPractitioners = vi.mocked(api.fetchPractitioners)
const fetchAuditEntries = vi.mocked(api.fetchAuditEntries)

/** Wednesday 11 November 2026, 15:00, local time. */
const NOW = new Date(2026, 10, 11, 15, 0)
const MIDNIGHT = new Date(2026, 10, 11).toISOString()

const SFAX = { id: 'c2', name: 'Clinique MedLink Sfax' }
const SOUSSE = { id: 'c1', name: 'Clinique MedLink Sousse' }
const TUNIS = { id: 'c3', name: 'Clinique MedLink Tunis' }

function account(id: string, role: OverviewAccount['role'], extra: Partial<OverviewAccount> = {}): OverviewAccount {
  return { id, role, enabled: true, emailVerified: true, ambiguousRole: false, ...extra }
}

const ACCOUNTS: OverviewAccount[] = [
  account('u1', 'PATIENT'),
  account('u2', 'PATIENT'),
  account('u3', 'PATIENT', { enabled: false }),
  account('u4', 'PRACTITIONER'),
  account('u5', 'PRACTITIONER', { emailVerified: false }),
  account('u6', 'ADMINISTRATIVE_STAFF', { emailVerified: false }),
  account('u7', null, { ambiguousRole: true }),
]

function practitioner(id: string, clinics: { id: string; name: string }[]): OverviewPractitioner {
  return { id, clinics }
}

const PRACTITIONERS = [practitioner('p1', [SOUSSE, SFAX]), practitioner('p2', [SOUSSE]), practitioner('p3', [TUNIS])]

function entry(id: string, action: string, outcome: string, at: Date, resourceType: string | null = 'USER'): AuditEntry {
  return { id, timestamp: at.toISOString(), action, outcome, resourceType, resourceId: 'a1b2c3d4-0000-4000-8000-00000000e9f0' }
}

const RECENT = [
  entry('e1', 'LOGIN', 'SUCCESS', new Date(2026, 10, 11, 14, 52)),
  entry('e2', 'ACCESS_DENIED', 'DENIED', new Date(2026, 10, 11, 14, 47), null),
  entry('e3', 'REPORT_CREATED', 'SUCCESS', new Date(2026, 10, 10, 13, 5), 'CONSULTATION_REPORT'),
]

function page(items: AuditEntry[], totalElements = items.length) {
  return { items, page: 0, size: items.length || 1, totalElements, totalPages: 1 }
}

function renderHome() {
  return render(
    <MemoryRouter>
      <StaffHome firstName="Amel" />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  fetchAccountsOverview.mockResolvedValue({ items: ACCOUNTS, total: ACCOUNTS.length })
  fetchPractitioners.mockResolvedValue(PRACTITIONERS)
  fetchAuditEntries.mockImplementation(async (query) => {
    if (query.action === 'ACCESS_DENIED') return page([], 3)
    if (query.from) return page([], 57)
    return page(RECENT)
  })
})

afterEach(() => {
  vi.useRealTimers()
})

test('greets by name with today’s date and sums up the network, with the two quick actions', async () => {
  renderHome()

  expect(screen.getByRole('heading', { level: 2, name: 'Bonjour Amel' })).toBeInTheDocument()
  expect(screen.getByText('mercredi 11 novembre 2026')).toBeInTheDocument()
  const hello = screen.getByRole('region', { name: 'Bonjour Amel' })
  expect(await within(hello).findByText(/3 praticiens/)).toBeInTheDocument()
  expect(hello).toHaveTextContent('Le réseau aujourd’hui : 3 praticiens dans 3 cliniques, 2 comptes à activer.')
  expect(within(hello).getByRole('link', { name: 'Nouveau compte' })).toHaveAttribute('href', '/admin/comptes?nouveau')
  expect(within(hello).getByRole('link', { name: 'Rendez-vous des cliniques' })).toHaveAttribute('href', '/admin/rendez-vous')
})

test('the four figures come from the accounts, the practitioners and today’s audit trail', async () => {
  renderHome()

  const figures = await screen.findByRole('list', { name: 'Le réseau en chiffres' })
  const items = within(figures).getAllByRole('listitem')
  expect(await within(items[0]).findByText('7')).toBeInTheDocument()
  expect(items[0]).toHaveTextContent('3 patients · 3 personnel')
  expect(items[1]).toHaveTextContent('Praticiens3dans 3 cliniques')
  expect(items[2]).toHaveTextContent('À activer2')
  expect(await within(items[3]).findByText('3')).toBeInTheDocument()
  expect(items[3]).toHaveTextContent('sur 57 actions tracées')
  // Today starts at local midnight; one request per figure, the smallest page
  expect(fetchAuditEntries).toHaveBeenCalledWith({ from: MIDNIGHT, size: 1 })
  expect(fetchAuditEntries).toHaveBeenCalledWith({ from: MIDNIGHT, action: 'ACCESS_DENIED', size: 1 })
})

test('the recent activity lists the latest audited actions in French, with their outcome and no name', async () => {
  renderHome()

  const activity = screen.getByRole('region', { name: 'Activité récente' })
  const rows = within(await within(activity).findByRole('list')).getAllByRole('listitem')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('Connexion')
  expect(rows[0]).toHaveTextContent('Compte utilisateur · a1b2…e9f0')
  expect(rows[0]).toHaveTextContent('14:52')
  expect(rows[0]).toHaveTextContent('Réussi')
  expect(rows[1]).toHaveTextContent('Accès refusé')
  expect(rows[1]).toHaveTextContent('Refusé')
  expect(rows[2]).toHaveTextContent('Compte rendu de consultation créé')
  expect(rows[2]).toHaveTextContent('Hier · 13:05')
  expect(fetchAuditEntries).toHaveBeenCalledWith({ size: 6 })
  expect(within(activity).getByRole('link', { name: 'Voir le journal d’audit' })).toHaveAttribute('href', '/admin/journal-audit')
})

test('the network lists each clinic with its practitioners, one practitioner counting in each of their clinics', async () => {
  renderHome()

  const network = screen.getByRole('region', { name: 'Le réseau' })
  const clinics = within(await within(network).findByRole('list')).getAllByRole('listitem')
  expect(clinics.map((clinic) => clinic.textContent)).toEqual([
    'Clinique MedLink Sfax1 praticien',
    'Clinique MedLink Sousse2 praticiens',
    'Clinique MedLink Tunis1 praticien',
  ])
  expect(within(network).getByRole('link', { name: 'Rendez-vous' })).toHaveAttribute('href', '/admin/rendez-vous')
})

test('the accounts to watch: waiting for activation, disabled, and a role to repair', async () => {
  renderHome()

  const watch = screen.getByRole('region', { name: 'Comptes à surveiller' })
  const rows = within(await within(watch).findByRole('list')).getAllByRole('listitem')
  expect(rows[0]).toHaveTextContent('2en attente d’activation')
  expect(rows[1]).toHaveTextContent('1désactivé')
  expect(rows[2]).toHaveTextContent('1rôle à réparer')
  expect(within(watch).getByRole('link', { name: 'Gérer les comptes' })).toHaveAttribute('href', '/admin/comptes')
  expect(fetchAccountsOverview).toHaveBeenCalledTimes(1)
})

test('with more accounts than one page, the breakdown says it counts the first ones only', async () => {
  fetchAccountsOverview.mockResolvedValue({ items: ACCOUNTS, total: 240 })
  renderHome()

  const watch = screen.getByRole('region', { name: 'Comptes à surveiller' })
  expect(await within(watch).findByText('Sur les 7 premiers comptes (240 au total).')).toBeInTheDocument()
})

test('the anonymised statistics are one click away', () => {
  renderHome()

  expect(screen.getByRole('link', { name: /Statistiques anonymisées/ })).toHaveAttribute('href', '/admin/statistiques')
})

test('a part that cannot be read says so and can be read again; the others stay usable', async () => {
  const user = userEvent.setup()
  fetchAuditEntries.mockRejectedValueOnce(
    new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'),
  )
  renderHome()

  const activity = screen.getByRole('region', { name: 'Activité récente' })
  expect(await within(activity).findByRole('alert')).toHaveTextContent('Connexion impossible.')
  expect(await within(screen.getByRole('region', { name: 'Le réseau' })).findByRole('list')).toBeInTheDocument()
  await user.click(within(activity).getByRole('button', { name: 'Réessayer' }))
  expect(await within(activity).findByRole('list')).toBeInTheDocument()
})
