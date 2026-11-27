import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import StaffProfilePage from './StaffProfilePage'

// The staff's profile, like the practitioner's and the patient's: who is logged in, the account as text (no route
// edits it yet), and one security card: the second step at login (the staff has one), the password, the session.
const logout = vi.fn()
vi.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 's1', email: 'staff.dev@medlink.local', firstName: 'Staff', lastName: 'Dev', roles: ['ADMINISTRATIVE_STAFF'] },
    logout,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/profil']}>
      <Routes>
        <Route path="/admin/profil" element={<StaffProfilePage />} />
        <Route path="/admin/mot-de-passe" element={<h2>Page mot de passe</h2>} />
        <Route path="/connexion" element={<h2>Connexion</h2>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  logout.mockResolvedValue(undefined)
})

test('says who is logged in: name, role and e-mail, as text, and whom to ask for a correction', () => {
  renderPage()

  const hero = screen.getByRole('region', { name: 'Mon profil' })
  expect(within(hero).getByRole('heading', { name: 'Staff Dev' })).toBeInTheDocument()
  expect(hero).toHaveTextContent('Personnel administratif')
  expect(hero).toHaveTextContent('staff.dev@medlink.local')
  const account = screen.getByRole('region', { name: 'Informations du compte' })
  expect(account).toHaveTextContent('Staff Dev')
  expect(account).toHaveTextContent('Personnel administratif')
  expect(account).toHaveTextContent(/contactez un autre membre du personnel administratif/)
  expect(within(account).queryByRole('textbox')).toBeNull()
})

test('the security card: the second step at login is on, the password changes on its page', async () => {
  const user = userEvent.setup()
  renderPage()

  const security = screen.getByRole('region', { name: 'Sécurité' })
  expect(security).toHaveTextContent('Connexion en deux étapes')
  expect(within(security).getByText('Activée')).toBeInTheDocument()
  expect(security).toHaveTextContent(/code à 6 chiffres/)
  await user.click(within(security).getByRole('link', { name: 'Modifier le mot de passe' }))

  expect(screen.getByRole('heading', { name: 'Page mot de passe' })).toBeInTheDocument()
})

test('"Se déconnecter" ends the session and goes to the login page', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(screen.getByRole('button', { name: 'Se déconnecter' }))

  expect(logout).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
})
