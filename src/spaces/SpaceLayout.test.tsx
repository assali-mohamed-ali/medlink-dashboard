import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'

// UI refresh B5 (docs/ui-refresh/PLAN.md §4.5): the frame of every space, on the real route table, API mocked
vi.mock('@/features/auth/api', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resendVerification: vi.fn(),
}))
const fetchMe = vi.mocked(authApi.fetchMe)

function renderAs(role: Role, path: string) {
  fetchMe.mockResolvedValue({
    user: { id: 'a1b2', email: 'amel@example.com', firstName: 'Amel', lastName: 'Test', roles: [role] },
  })
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
})

test('the first Tab reaches "Aller au contenu", which leads to the page content', async () => {
  renderAs('PATIENT', '/patient')
  await screen.findByRole('heading', { level: 1, name: 'Espace patient' })
  await userEvent.tab()
  const skip = screen.getByRole('link', { name: 'Aller au contenu' })
  expect(skip).toHaveFocus()
  expect(skip).toHaveAttribute('href', '#contenu')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'contenu')
})

test('the menu marks the page you are on', async () => {
  renderAs('ADMINISTRATIVE_STAFF', '/admin/comptes')
  const menu = await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  expect(within(menu).getByRole('link', { name: 'Gestion des comptes' })).toHaveAttribute('aria-current', 'page')
  expect(within(menu).getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current')
})

test.each([
  ['PATIENT', '/patient', 'Patient'],
  ['PRACTITIONER', '/praticien', 'Praticien'],
  ['ADMINISTRATIVE_STAFF', '/admin', 'Personnel administratif'],
] as const)('the top bar shows a %s who is logged in, their role in French and their initials', async (role, path, label) => {
  renderAs(role, path)
  const banner = await screen.findByRole('banner')
  expect(within(banner).getByText('Amel Test')).toBeInTheDocument()
  expect(within(banner).getByText(label)).toBeInTheDocument()
  expect(banner).toHaveTextContent('AT')
  expect(within(banner).getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument()
})

test('after moving to another page, the focus is on the page title (screen readers hear where they are)', async () => {
  renderAs('ADMINISTRATIVE_STAFF', '/admin')
  const menu = await screen.findByRole('navigation', { name: 'Menu de l’espace' })
  await userEvent.click(within(menu).getByRole('link', { name: 'Gestion des comptes' }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
})

test('the focus is left alone on the first page shown', async () => {
  renderAs('PATIENT', '/patient')
  await screen.findByRole('heading', { level: 1, name: 'Espace patient' })
  expect(document.body).toHaveFocus()
})

test('a page still to build says so honestly, with one main region and one page title', async () => {
  renderAs('ADMINISTRATIVE_STAFF', '/admin/comptes')
  expect(await screen.findByRole('heading', { level: 2, name: 'Gestion des comptes' })).toBeInTheDocument()
  expect(screen.getByText('Bientôt disponible')).toBeInTheDocument()
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
})
