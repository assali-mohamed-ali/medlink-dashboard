import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as auditApi from '@/features/audit/api'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import { ApiError } from '@/shared/api/apiClient'
import { paths } from '@/shared/config/paths'

// The real route table, with the API mocked at the auth and audit features' api.ts
vi.mock('@/features/auth/api', () => ({
  changePassword: vi.fn(),
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
vi.mock('@/features/audit/api', () => ({ fetchAuditEntries: vi.fn() }))
const fetchMe = vi.mocked(authApi.fetchMe)
const fetchAuditEntries = vi.mocked(auditApi.fetchAuditEntries)

function loggedInAs(role: Role) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
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
  fetchMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
  fetchAuditEntries.mockResolvedValue({ items: [], page: 0, size: 50, totalElements: 0, totalPages: 0 })
})

test('the administrative staff reaches the audit log inside their space', async () => {
  loggedInAs('ADMINISTRATIVE_STAFF')
  renderAt(paths.staff.audit)
  expect(await screen.findByRole('heading', { name: "Journal d'audit" })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Espace administratif' })).toBeInTheDocument()
  expect(fetchAuditEntries).toHaveBeenCalledWith({ page: 0, size: 50 })
})

test('the staff menu has an audit entry, marked current on the audit page', async () => {
  loggedInAs('ADMINISTRATIVE_STAFF')
  renderAt(paths.staff.audit)
  await screen.findByRole('heading', { name: "Journal d'audit" })
  const entry = within(screen.getByRole('navigation', { name: 'Menu de l’espace' })).getByRole('link', {
    name: 'Journal d’audit',
  })
  expect(entry).toHaveAttribute('href', paths.staff.audit)
  expect(entry).toHaveAttribute('aria-current', 'page')
})

test.each(['PATIENT', 'PRACTITIONER'] as const)(
  'a %s opening the audit log gets "Accès refusé" and nothing is requested',
  async (role) => {
    loggedInAs(role)
    renderAt(paths.staff.audit)
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: "Journal d'audit" })).toBeNull()
    expect(fetchAuditEntries).not.toHaveBeenCalled()
  },
)

test('a visitor opening the audit log is sent to the login page, nothing requested', async () => {
  const router = renderAt(paths.staff.audit)
  expect(await screen.findByRole('heading', { name: 'Bienvenue sur MedLink' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/connexion')
  expect(fetchAuditEntries).not.toHaveBeenCalled()
})

test.each(['PATIENT', 'PRACTITIONER'] as const)('the %s menu has no audit entry', async (role) => {
  loggedInAs(role)
  renderAt(role === 'PATIENT' ? paths.patient.root : paths.practitioner.root)
  await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  expect(screen.queryByRole('link', { name: 'Journal d’audit' })).toBeNull()
})
