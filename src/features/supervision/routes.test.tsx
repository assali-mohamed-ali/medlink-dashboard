import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import { ApiError } from '@/shared/api/apiClient'
import { paths } from '@/shared/config/paths'
import * as supervisionApi from './api'

// The real route table, with the API mocked at the auth and supervision features' api.ts
vi.mock('@/features/auth/api', () => ({
  changePassword: vi.fn(),
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
vi.mock('./api', () => ({ fetchPractitioners: vi.fn(), fetchPractitionerAgenda: vi.fn(), fetchClinics: vi.fn(), fetchClinicActivity: vi.fn() }))
const fetchMe = vi.mocked(authApi.fetchMe)
const fetchPractitioners = vi.mocked(supervisionApi.fetchPractitioners)

function loggedInAs(role: Role) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
  })
}

function renderAt(path: string) {
  render(
    <AuthProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchMe.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Non connecté.'))
  vi.mocked(supervisionApi.fetchClinics).mockResolvedValue([])
  fetchPractitioners.mockResolvedValue([])
})

// MLink-35: the "Rendez-vous des cliniques" part of the staff home was "Bientôt disponible"
test('the administrative staff reach the clinics\' appointments inside their space, from the menu', async () => {
  loggedInAs('ADMINISTRATIVE_STAFF')
  renderAt(paths.staff.activity)

  expect(await screen.findByRole('heading', { level: 2, name: 'Rendez-vous des cliniques' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Espace administratif' })).toBeInTheDocument()
  const entry = within(screen.getByRole('navigation', { name: 'Menu de l’espace' })).getByRole('link', {
    name: 'Rendez-vous des cliniques',
  })
  expect(entry).toHaveAttribute('aria-current', 'page')
  expect(fetchPractitioners).toHaveBeenCalled()
})

test('the staff home leads to "Rendez-vous des cliniques", no longer "Bientôt disponible"', async () => {
  loggedInAs('ADMINISTRATIVE_STAFF')
  renderAt(paths.staff.root)

  const main = within(await screen.findByRole('main'))
  expect(await main.findByRole('link', { name: 'Rendez-vous des cliniques' })).toHaveAttribute('href', paths.staff.activity)
  expect(screen.queryByText('Bientôt disponible')).toBeNull()
})

test.each(['PATIENT', 'PRACTITIONER'] as const)('a %s gets "Accès refusé" and the API is never asked', async (role) => {
  loggedInAs(role)
  renderAt(paths.staff.activity)

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(fetchPractitioners).not.toHaveBeenCalled()
})
