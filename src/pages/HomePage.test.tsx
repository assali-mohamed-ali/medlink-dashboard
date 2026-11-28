import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { useAuth, type AuthUser } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import HomePage from './HomePage'

vi.mock('@/features/auth', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/auth')>(),
  useAuth: vi.fn(),
}))

let user: AuthUser | null = null
beforeEach(() => {
  user = null
  vi.mocked(useAuth).mockImplementation(() => ({ user } as ReturnType<typeof useAuth>))
})
function show() {
  render(<MemoryRouter><HomePage /></MemoryRouter>)
}
test('public entry points use protected patient routes and existing account routes', () => {
  show()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vos soins commencent ici.')
  expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', paths.patient.slots)
  expect(screen.getByRole('link', { name: /Gérer mes rendez-vous/ })).toHaveAttribute('href', paths.patient.appointments)
  expect(screen.getByRole('link', { name: /Consulter mes résultats/ })).toHaveAttribute('href', paths.patient.results)
  expect(screen.getByRole('link', { name: /Mes documents médicaux/ })).toHaveAttribute('href', paths.patient.documents)
  expect(screen.getByRole('link', { name: 'Créer mon compte' })).toHaveAttribute('href', paths.signup)
  expect(screen.getByRole('link', { name: 'Accès professionnel' })).toHaveAttribute('href', paths.login)
  expect(screen.queryByText('98.4%')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Rechercher' })).not.toBeInTheDocument()
})
test('FAQ is keyboard operable and public navigation anchors exist', async () => {
  const keyboard = userEvent.setup()
  show()
  const nav = within(screen.getByRole('navigation', { name: 'Navigation publique' }))
  for (const link of nav.getAllByRole('link')) {
    expect(document.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull()
  }
  const summary = screen.getByText('Ai-je besoin d’un compte pour réserver ?')
  summary.focus()
  await keyboard.keyboard('[Enter]')
  expect(summary.parentElement).toHaveAttribute('open')
  await keyboard.keyboard('[Enter]')
  expect(summary.parentElement).not.toHaveAttribute('open')
})
test('signed-in practitioners return to their own workspace', () => {
  user = { id: 'synthetic', firstName: 'Test', lastName: 'User', email: 'test@example.com', roles: ['PRACTITIONER'] }
  show()
  expect(screen.getByRole('link', { name: 'Prendre rendez-vous' })).toHaveAttribute('href', paths.practitioner.root)
  expect(screen.getByRole('link', { name: 'Accès professionnel' })).toHaveAttribute('href', paths.practitioner.root)
  expect(screen.queryByRole('link', { name: 'Créer mon compte' })).not.toBeInTheDocument()
})
