import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { routes } from '@/app/routes'
import * as authApi from '@/features/auth/api'
import AuthProvider from '@/features/auth/AuthProvider'
import type { Role } from '@/features/auth/roles'
import * as api from './api'

vi.mock('@/features/auth/api', () => ({ fetchMe: vi.fn(), login: vi.fn(), logout: vi.fn() }))
vi.mock('./api', () => ({
  fetchProposals: vi.fn(), decideProposal: vi.fn(), fetchPractitioners: vi.fn(),
  fetchCandidates: vi.fn(), fetchTargets: vi.fn(), createProposal: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.fetchProposals).mockResolvedValue({ items: [], page: 0, size: 20, total: 0 })
  vi.mocked(api.fetchPractitioners).mockResolvedValue([])
})

function open(path: string, role: Role) {
  vi.mocked(authApi.fetchMe).mockResolvedValue({
    user: { id: 'test', email: 'test@example.com', firstName: 'Test', lastName: 'Test', roles: [role] },
  })
  render(<AuthProvider><RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} /></AuthProvider>)
}

const PAGES = [
  ['/patient/rendez-vous/reaffectations', 'PATIENT', 'Propositions de réaffectation'],
  ['/praticien/agenda/reaffectations', 'PRACTITIONER', 'Propositions de réaffectation'],
  ['/admin/comptes/affectations/reaffectations', 'ADMINISTRATIVE_STAFF', 'Réaffectations de rendez-vous'],
] as const

test.each(PAGES)('the proper role opens %s', async (path, role, heading) => {
  open(path, role)
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
})

test.each(PAGES)('a wrong role cannot open %s', async (path, role) => {
  open(path, role === 'PATIENT' ? 'PRACTITIONER' : 'PATIENT')
  expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument()
  expect(api.fetchProposals).not.toHaveBeenCalled()
})
