import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import * as api from './api'

// MLink-73 (20.5): /admin/comptes is the back-office page, for the administrative staff only.
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('@/features/alerts/api', () => ({ fetchUnreadAlerts: vi.fn().mockResolvedValue([]), markAlertRead: vi.fn() }))
vi.mock('./api', () => ({
  PAGE_SIZE: 20,
  fetchAccounts: vi.fn(),
  createAccount: vi.fn(),
  changeRole: vi.fn(),
  setAccountEnabled: vi.fn(),
  forcePasswordReset: vi.fn(),
  fetchProfileChoices: vi.fn(),
}))

function renderAs(role: Role) {
  vi.mocked(authApi.fetchMe).mockResolvedValue({
    user: { id: 'a1b2', email: 'staff.dev@medlink.local', firstName: 'Salma', lastName: 'Staff', roles: [role] },
  })
  render(
    <AuthProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/comptes'] })} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.mocked(api.fetchAccounts).mockReset().mockResolvedValue({ items: [], total: 0 })
})

test('the administrative staff get the accounts page, no longer "Bientôt disponible"', async () => {
  renderAs('ADMINISTRATIVE_STAFF')

  expect(await screen.findByRole('heading', { level: 2, name: 'Gestion des comptes' })).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Nouveau compte' })).toBeInTheDocument()
  expect(screen.queryByText('Bientôt disponible')).toBeNull()
  expect(api.fetchAccounts).toHaveBeenCalled()
})

test.each(['PATIENT', 'PRACTITIONER'] as const)('a %s gets "Accès refusé" and the API is never asked', async (role) => {
  renderAs(role)

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(api.fetchAccounts).not.toHaveBeenCalled()
})
