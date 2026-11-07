import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import * as api from './api'

// MLink-101: the slot search is a page of the patient's space, reached from its menu; no other role opens it.
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('./api', () => ({ fetchSlotFilters: vi.fn(), searchSlots: vi.fn() }))
const fetchMe = vi.mocked(authApi.fetchMe)

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
  vi.mocked(api.fetchSlotFilters).mockResolvedValue({ clinics: [], specialties: [], practitioners: [] })
  vi.mocked(api.searchSlots).mockResolvedValue({ items: [], total: 0 })
})

test('a patient opens the slot search from the menu of their space', async () => {
  const user = userEvent.setup()
  loggedInAs('PATIENT')
  const router = renderAt('/patient')

  await user.click(await screen.findByRole('link', { name: 'Prendre rendez-vous' }))

  expect(await screen.findByRole('heading', { name: 'Prendre un rendez-vous' })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/patient/creneaux')
})

test.each(['PRACTITIONER', 'ADMINISTRATIVE_STAFF'] as const)('a %s gets "Accès refusé"', async (role) => {
  loggedInAs(role)
  renderAt('/patient/creneaux')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Prendre un rendez-vous' })).toBeNull()
  expect(api.searchSlots).not.toHaveBeenCalled()
})
