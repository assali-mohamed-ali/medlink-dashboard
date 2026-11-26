import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import * as reportsApi from '@/features/my-reports/api'
import { ApiError } from '@/shared/api/apiClient'
import { paths } from '@/shared/config/paths'

// MLink-32 follow-up: the real route table, with the API mocked at the auth and my-reports features' api.ts
vi.mock('@/features/auth/api', () => ({
  changePassword: vi.fn(),
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
vi.mock('@/features/my-reports/api', () => ({ fetchMyReports: vi.fn() }))
const fetchMe = vi.mocked(authApi.fetchMe)
const fetchMyReports = vi.mocked(reportsApi.fetchMyReports)

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
  fetchMyReports.mockResolvedValue([])
})

test('a patient reaches their reports inside their space, from a menu entry marked current', async () => {
  loggedInAs('PATIENT')
  renderAt(paths.patient.reports)

  expect(await screen.findByRole('heading', { name: 'Mes comptes-rendus' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Espace patient' })).toBeInTheDocument()
  const entry = within(screen.getByRole('navigation', { name: 'Menu de l’espace' })).getByRole('link', {
    name: 'Comptes-rendus',
  })
  expect(entry).toHaveAttribute('href', '/patient/comptes-rendus')
  expect(entry).toHaveAttribute('aria-current', 'page')
  expect(fetchMyReports).toHaveBeenCalledTimes(1)
})

test.each(['PRACTITIONER', 'ADMINISTRATIVE_STAFF'] as const)(
  'a %s opening the patient’s reports gets "Accès refusé" and nothing is requested',
  async (role) => {
    loggedInAs(role)
    renderAt(paths.patient.reports)

    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
    expect(fetchMyReports).not.toHaveBeenCalled()
  },
)
