import { render, screen, within } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'

// UI refresh B6 (docs/ui-refresh/PLAN.md §4.5): each space's home greets the person and shows what matters for the
// role; what is not built yet says "Bientôt disponible", never fake data
vi.mock('@/features/auth/api', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
const fetchMe = vi.mocked(authApi.fetchMe)

function renderHome(role: Role, path: string) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
  })
  render(
    <AuthProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

test.each([
  ['PATIENT', '/patient', ['Rendez-vous', 'Documents', 'Messages']],
  ['PRACTITIONER', '/praticien', ['Agenda', 'Patients', 'Messages']],
  ['ADMINISTRATIVE_STAFF', '/admin', ['Gestion des comptes', 'Rendez-vous des cliniques']],
] as const)('a %s is greeted by name and sees the parts of their space', async (role, path, parts) => {
  renderHome(role, path)
  expect(await screen.findByRole('heading', { level: 2, name: 'Bonjour Amel' })).toBeInTheDocument()
  const titles = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
  expect(titles).toEqual(parts)
})

test('what a patient cannot use yet says so, with no link to a page that does not exist', async () => {
  renderHome('PATIENT', '/patient')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour Amel' })
  expect(main.getAllByText('Bientôt disponible')).toHaveLength(3)
  expect(main.queryAllByRole('link')).toHaveLength(0)
})

test('the staff home leads to account management in one click', async () => {
  renderHome('ADMINISTRATIVE_STAFF', '/admin')
  const main = within(await screen.findByRole('main'))
  await main.findByRole('heading', { level: 2, name: 'Bonjour Amel' })
  expect(main.getByRole('link', { name: 'Ouvrir la gestion des comptes' })).toHaveAttribute('href', '/admin/comptes')
  expect(main.getAllByText('Bientôt disponible')).toHaveLength(1)
})
