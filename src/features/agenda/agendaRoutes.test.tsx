import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import * as api from './api'

// MLink-26 (26.7): the agenda is a page of the practitioner's space, reached from its menu; no other role opens it.
vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('./api', () => ({ fetchAgenda: vi.fn(), openSlot: vi.fn(), changeSlotStatus: vi.fn() }))
const fetchMe = vi.mocked(authApi.fetchMe)

const TITLE = 'Agenda praticien — Consultations multi-cliniques'

function loggedInAs(role: Role) {
  fetchMe.mockResolvedValue({
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
  vi.mocked(api.fetchAgenda).mockResolvedValue({ clinics: [], items: [] })
})

test('a practitioner opens the agenda from the menu of their space', async () => {
  const user = userEvent.setup()
  loggedInAs('PRACTITIONER')
  const router = renderAt('/praticien')

  await user.click(await screen.findByRole('link', { name: 'Agenda' }))

  expect(await screen.findByRole('heading', { name: TITLE, level: 2 })).toBeInTheDocument()
  expect(router.state.location.pathname).toBe('/praticien/agenda')
})

test.each(['PATIENT', 'ADMINISTRATIVE_STAFF'] as const)('a %s gets "Accès refusé" and the API is never asked', async (role) => {
  loggedInAs(role)
  renderAt('/praticien/agenda')

  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: TITLE, level: 2 })).toBeNull()
  expect(api.fetchAgenda).not.toHaveBeenCalled()
})
