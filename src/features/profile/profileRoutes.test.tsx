import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as agendaApi from '@/features/agenda/api'
import * as profileApi from './api'
import * as alertsApi from '@/features/alerts/api'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'

// The profile is a page of the practitioner's space, reached from its menu; no other role opens it.
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('@/features/agenda/api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<typeof import('./api')>()), fetchWeek: vi.fn() }))
vi.mock('@/features/alerts/api', () => ({ fetchUnreadAlerts: vi.fn(), markAlertRead: vi.fn() }))

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
  vi.mocked(profileApi.fetchWeek).mockResolvedValue({ clinics: [], items: [] })
})

test('a practitioner opens "Profil" from the menu, then the password page from the profile', async () => {
  const user = userEvent.setup()
  loggedInAs('PRACTITIONER')
  const router = renderAt('/praticien')

  await user.click(await screen.findByRole('link', { name: 'Profil' }))
  expect(await screen.findByRole('heading', { name: 'Profil & sécurité', level: 2 })).toBeInTheDocument()
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
