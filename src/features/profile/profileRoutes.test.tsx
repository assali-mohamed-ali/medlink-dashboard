import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as agendaApi from '@/features/agenda/api'
import * as profileApi from './api'
import * as slotsApi from '@/features/slots/api'
import * as alertsApi from '@/features/alerts/api'
import * as auditApi from '@/features/audit/api'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'

// The profile is a page of the practitioner's space and of the patient's, reached from the menu; no other role opens it.
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('@/features/agenda/api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchWeek: vi.fn(),
  fetchMyAppointments: vi.fn(),
}))
// The patient's home reads their appointments too
vi.mock('@/features/slots/api', () => ({ fetchMyAppointments: vi.fn(), cancelAppointment: vi.fn() }))
vi.mock('@/features/alerts/api', () => ({ fetchUnreadAlerts: vi.fn(), markAlertRead: vi.fn() }))
// The staff's audit log, where its walk to the profile starts
vi.mock('@/features/audit/api', () => ({ fetchAuditEntries: vi.fn() }))

function loggedInAs(role: Role) {
  vi.mocked(authApi.fetchMe).mockResolvedValue({
    user: { id: 'a1b2', email: 'sami@example.com', firstName: 'Sami', lastName: 'Test', roles: [role] },
  })
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(agendaApi.fetchAgenda).mockResolvedValue({ clinics: [], items: [] })
  vi.mocked(alertsApi.fetchUnreadAlerts).mockResolvedValue([])
  vi.mocked(auditApi.fetchAuditEntries).mockResolvedValue({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 })
  vi.mocked(profileApi.fetchWeek).mockResolvedValue({ clinics: [], items: [] })
  vi.mocked(profileApi.fetchMyAppointments).mockResolvedValue({ items: [], total: 0 })
  vi.mocked(slotsApi.fetchMyAppointments).mockResolvedValue({ items: [], total: 0 })
})

test('a practitioner opens "Profil" from the menu, then the password page from the profile', async () => {
  const user = userEvent.setup()
  loggedInAs('PRACTITIONER')
  const router = renderAt('/praticien')

  await user.click(await screen.findByRole('link', { name: 'Profil' }))
  expect(await screen.findByRole('region', { name: 'Mon profil' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/praticien/profil')

  // The password page is reached from the profile only: no "Mot de passe" entry in the practitioner's menu
  const menu = screen.getByRole('navigation', { name: 'Menu de l’espace' })
  expect(within(menu).queryByRole('link', { name: 'Mot de passe' })).toBeNull()

  await user.click(screen.getByRole('link', { name: 'Modifier le mot de passe' }))
  // The password page is a lazy route: the move completes once its chunk is loaded
  await waitFor(() => expect(router.state.location.pathname).toBe('/praticien/mot-de-passe'))
  // On the password page, "Profil" stays the current entry of the menu
  expect(await within(menu).findByRole('link', { name: 'Profil' })).toHaveAttribute('aria-current', 'page')
})

test.each(['PATIENT', 'ADMINISTRATIVE_STAFF'] as const)('a %s gets "Accès refusé"', async (role) => {
  loggedInAs(role)
  renderAt('/praticien/profil')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Profil & sécurité' })).toBeNull()
})

test('the practitioner’s password page has a way back to the profile, the card in the middle of the page', async () => {
  const user = userEvent.setup()
  loggedInAs('PRACTITIONER')
  const router = renderAt('/praticien/mot-de-passe')

  expect(await screen.findByRole('heading', { name: 'Changer mon mot de passe' })).toBeInTheDocument()
  const rules = screen.getByRole('list', { name: 'Règles du mot de passe' })
  expect(screen.getByText('Votre nouveau mot de passe doit contenir :')).toBeInTheDocument()
  expect(rules).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: 'Retour au profil' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/praticien/profil'))
})

test('a patient opens "Profil" from the menu, then the password page from the profile, and back', async () => {
  const user = userEvent.setup()
  loggedInAs('PATIENT')
  const router = renderAt('/patient')

  const menu = await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  // No "Mot de passe" entry any more: it is a part of the profile
  expect(within(menu).queryByRole('link', { name: 'Mot de passe' })).toBeNull()
  await user.click(within(menu).getByRole('link', { name: 'Profil' }))
  expect(await screen.findByRole('region', { name: 'Mon profil' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/patient/profil')

  await user.click(screen.getByRole('link', { name: 'Modifier le mot de passe' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/patient/mot-de-passe'))
  expect(await within(menu).findByRole('link', { name: 'Profil' })).toHaveAttribute('aria-current', 'page')

  await user.click(await screen.findByRole('link', { name: 'Retour au profil' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/patient/profil'))
})

test('the staff opens "Profil" from the menu, then the password page from the profile, and back', async () => {
  const user = userEvent.setup()
  loggedInAs('ADMINISTRATIVE_STAFF')
  const router = renderAt('/admin/journal-audit')

  const menu = await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  // Like the other spaces: no "Mot de passe" entry, it is a part of the profile
  expect(within(menu).queryByRole('link', { name: 'Mot de passe' })).toBeNull()
  await user.click(within(menu).getByRole('link', { name: 'Profil' }))
  expect(await screen.findByRole('region', { name: 'Mon profil' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/admin/profil')

  await user.click(screen.getByRole('link', { name: 'Modifier le mot de passe' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin/mot-de-passe'))
  expect(await within(menu).findByRole('link', { name: 'Profil' })).toHaveAttribute('aria-current', 'page')

  await user.click(await screen.findByRole('link', { name: 'Retour au profil' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin/profil'))
})

test.each(['PATIENT', 'PRACTITIONER'] as const)('a %s opening the staff’s profile gets "Accès refusé"', async (role) => {
  loggedInAs(role)
  renderAt('/admin/profil')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
})

test.each(['PRACTITIONER', 'ADMINISTRATIVE_STAFF'] as const)('a %s opening the patient’s profile gets "Accès refusé"', async (role) => {
  loggedInAs(role)
  renderAt('/patient/profil')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(profileApi.fetchMyAppointments).not.toHaveBeenCalled()
})
