import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Account } from '../types'
import AccountsPage from './AccountsPage'

// MLink-73 (20.5): the back-office page of the administrative staff. The API is mocked at the feature's api.ts, from
// the contracts of api-MedLink (MLink-69, 70, 88): GET/POST /api/admin/users, PUT .../role, PATCH .../status,
// POST .../force-password-reset.
vi.mock('../api', () => ({
  PAGE_SIZE: 20,
  fetchAccounts: vi.fn(),
  createAccount: vi.fn(),
  changeRole: vi.fn(),
  updateName: vi.fn(),
  setAccountEnabled: vi.fn(),
  forcePasswordReset: vi.fn(),
  fetchProfileChoices: vi.fn(),
}))
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'me', email: 'staff.dev@medlink.local', firstName: 'Salma', lastName: 'Staff', roles: [] } }),
}))

const fetchAccounts = vi.mocked(api.fetchAccounts)
const createAccount = vi.mocked(api.createAccount)
const changeRole = vi.mocked(api.changeRole)
const setAccountEnabled = vi.mocked(api.setAccountEnabled)
const forcePasswordReset = vi.mocked(api.forcePasswordReset)

function account(overrides: Partial<Account>): Account {
  return {
    id: 'u1',
    email: 'sami.dev@medlink.local',
    firstName: 'Sami',
    lastName: 'Dev',
    role: 'PRACTITIONER',
    roles: ['PRACTITIONER'],
    ambiguousRole: false,
    enabled: true,
    emailVerified: true,
    ...overrides,
  }
}

const SAMI = account({})
const NOUR = account({
  id: 'u2',
  email: 'nour@medlink.local',
  firstName: 'Nour',
  lastName: 'Admin',
  role: 'ADMINISTRATIVE_STAFF',
  roles: ['ADMINISTRATIVE_STAFF'],
})
const AMEL = account({ id: 'u3', email: 'amel@example.com', firstName: 'Amel', lastName: 'Patient', role: 'PATIENT', roles: ['PATIENT'] })
const ME = account({
  id: 'me',
  email: 'staff.dev@medlink.local',
  firstName: 'Salma',
  lastName: 'Staff',
  role: 'ADMINISTRATIVE_STAFF',
  roles: ['ADMINISTRATIVE_STAFF'],
})
const CHOICES = {
  clinics: [
    { id: 'c1', name: 'Clinique MedLink Sousse', city: 'Sousse' },
    { id: 'c2', name: 'Clinique MedLink Sfax', city: 'Sfax' },
  ],
  specialties: [
    { id: 's1', name: 'Cardiologie' },
    { id: 's2', name: 'Médecine générale' },
  ],
}

function renderPage() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AccountsPage />
    </MemoryRouter>,
  )
  return user
}

async function table() {
  return screen.findByRole('table', { name: /Comptes/ })
}

async function rowOf(name: string) {
  return within(await table()).findByRole('row', { name: new RegExp(name) })
}

/** Opens the row's "⋯" menu (one button per row, named after the person) and returns the menu. */
async function openMenu(user: ReturnType<typeof userEvent.setup>, row: HTMLElement, name: string) {
  await user.click(within(row).getByRole('button', { name: `Actions pour ${name}` }))
  return screen.getByRole('menu', { name: `Actions pour ${name}` })
}

/** Chooses an action in the row's menu. */
async function choose(user: ReturnType<typeof userEvent.setup>, row: HTMLElement, name: string, item: string) {
  const menu = await openMenu(user, row, name)
  await user.click(within(menu).getByRole('menuitem', { name: new RegExp(`^${item}`) }))
}

beforeEach(() => {
  vi.resetAllMocks()
  fetchAccounts.mockResolvedValue({ items: [SAMI, NOUR, AMEL, ME], total: 4 })
  vi.mocked(api.fetchProfileChoices).mockResolvedValue(CHOICES)
})

// ---- the list ----

test('lists the accounts: who (name and e-mail together), rôle, statut, and one actions button', async () => {
  fetchAccounts.mockResolvedValue({
    items: [SAMI, account({ id: 'u4', firstName: 'Ines', lastName: 'Off', email: 'ines@medlink.local', enabled: false })],
    total: 2,
  })
  renderPage()

  const grid = await table()
  const headers = within(grid).getAllByRole('columnheader').map((cell) => cell.textContent)
  expect(headers).toEqual(['Compte', 'Rôle', 'Statut', 'Actions'])
  const sami = within(grid).getByRole('row', { name: /sami\.dev@medlink\.local/ })
  expect(sami).toHaveTextContent('Sami Dev')
  // One button per row instead of three: the actions are in its menu
  expect(within(sami).getAllByRole('button')).toHaveLength(1)
  expect(sami).toHaveTextContent('Praticien')
  expect(sami).toHaveTextContent('Actif')
  expect(within(grid).getByRole('row', { name: /ines@medlink\.local/ })).toHaveTextContent('Désactivé')
  expect(fetchAccounts).toHaveBeenCalledWith('', 0)
})

test('a staff member, a patient, an account still to activate and one with two roles are named as such', async () => {
  fetchAccounts.mockResolvedValue({
    items: [
      NOUR,
      AMEL,
      account({ id: 'u5', email: 'new@medlink.local', emailVerified: false }),
      account({ id: 'u6', email: 'odd@medlink.local', role: null, roles: ['PRACTITIONER', 'ADMINISTRATIVE_STAFF'], ambiguousRole: true }),
    ],
    total: 4,
  })
  renderPage()

  expect(await rowOf('nour@medlink.local')).toHaveTextContent('Personnel administratif')
  expect(await rowOf('amel@example.com')).toHaveTextContent('Patient')
  expect(await rowOf('new@medlink.local')).toHaveTextContent('Activation en attente')
  expect(await rowOf('odd@medlink.local')).toHaveTextContent('Rôle à corriger')
})

test('the list filters while typing, without a button: one request once the typing pauses, from the first page', async () => {
  fetchAccounts.mockResolvedValue({ items: [SAMI], total: 45 })
  const user = renderPage()
  await table()
  await user.click(screen.getByRole('button', { name: 'Page suivante' }))
  await waitFor(() => expect(fetchAccounts).toHaveBeenLastCalledWith('', 1))

  await user.type(screen.getByRole('searchbox', { name: 'Rechercher un compte' }), 'sami')

  await waitFor(() => expect(fetchAccounts).toHaveBeenLastCalledWith('sami', 0))
  expect(screen.queryByRole('button', { name: 'Rechercher' })).toBeNull()
  // Not one request per letter
  expect(fetchAccounts.mock.calls.map((call) => call[0])).not.toContain('s')
  expect(fetchAccounts.mock.calls.map((call) => call[0])).not.toContain('sa')
})

test('emptying the search field shows every account again', async () => {
  const user = renderPage()
  await table()
  const field = screen.getByRole('searchbox', { name: 'Rechercher un compte' })

  await user.type(field, 'nour')
  await waitFor(() => expect(fetchAccounts).toHaveBeenLastCalledWith('nour', 0))
  await user.clear(field)

  await waitFor(() => expect(fetchAccounts).toHaveBeenLastCalledWith('', 0))
})

test('the number of accounts found is shown above the table', async () => {
  fetchAccounts.mockResolvedValue({ items: [SAMI, NOUR], total: 45 })
  renderPage()

  expect(await screen.findByText('45 comptes')).toBeInTheDocument()
})

test('no match: says so instead of an empty table', async () => {
  fetchAccounts.mockResolvedValue({ items: [], total: 0 })
  renderPage()

  expect(await screen.findByText('Aucun compte ne correspond à votre recherche.')).toBeInTheDocument()
})

test('pagination: "Page 1 sur 3", then "Suivant" asks for the next page', async () => {
  fetchAccounts.mockResolvedValue({ items: [SAMI], total: 45 })
  const user = renderPage()
  await table()

  expect(screen.getByText('Page 1 sur 3')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Page précédente' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Page suivante' }))

  await waitFor(() => expect(fetchAccounts).toHaveBeenLastCalledWith('', 1))
  expect(await screen.findByText('Page 2 sur 3')).toBeInTheDocument()
})

test('the list cannot be loaded: an error and a way to try again', async () => {
  fetchAccounts.mockRejectedValueOnce(new ApiError(503, 'KEYCLOAK_UNAVAILABLE', 'Service indisponible.'))
  const user = renderPage()

  expect(await screen.findByText('Service indisponible.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await table()).toBeInTheDocument()
})

// ---- "Nouveau compte" ----

test('opened from the staff home ("?nouveau"), the page shows the new account dialog at once', async () => {
  render(
    <MemoryRouter initialEntries={['/admin/comptes?nouveau']}>
      <AccountsPage />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('dialog', { name: 'Nouveau compte' })).toBeInTheDocument()
})

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await table()
  await user.click(screen.getByRole('button', { name: 'Nouveau compte' }))
  return screen.getByRole('dialog', { name: 'Nouveau compte' })
}

test('creates a staff account: e-mail, prénom, nom, rôle, and no password field anywhere', async () => {
  createAccount.mockResolvedValue({ ...NOUR, id: 'u9', email: 'lina@medlink.local', firstName: 'Lina', lastName: 'Ben Ali' })
  const user = renderPage()
  const dialog = await openCreate(user)

  expect(document.querySelector('input[type="password"]')).toBeNull()
  await user.type(within(dialog).getByLabelText('Adresse e-mail'), 'lina@medlink.local')
  await user.type(within(dialog).getByLabelText('Prénom'), 'Lina')
  await user.type(within(dialog).getByLabelText('Nom'), 'Ben Ali')
  await user.click(within(dialog).getByRole('radio', { name: 'Personnel administratif' }))
  await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))

  expect(createAccount).toHaveBeenCalledExactlyOnceWith({
    email: 'lina@medlink.local',
    firstName: 'Lina',
    lastName: 'Ben Ali',
    role: 'ADMINISTRATIVE_STAFF',
  })
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Compte créé pour Lina Ben Ali. Un e-mail d’activation lui a été envoyé.',
  )
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(fetchAccounts).toHaveBeenCalledTimes(2)
})

test('a practitioner also needs a specialty and clinics, chosen from the lists', async () => {
  createAccount.mockResolvedValue(SAMI)
  const user = renderPage()
  const dialog = await openCreate(user)

  await user.type(within(dialog).getByLabelText('Adresse e-mail'), 'sami.dev@medlink.local')
  await user.type(within(dialog).getByLabelText('Prénom'), 'Sami')
  await user.type(within(dialog).getByLabelText('Nom'), 'Dev')
  await user.click(within(dialog).getByRole('radio', { name: 'Praticien' }))
  await user.selectOptions(await within(dialog).findByLabelText('Spécialité'), 'Cardiologie')
  await user.click(within(dialog).getByRole('checkbox', { name: 'Clinique MedLink Sfax' }))
  await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))

  expect(createAccount).toHaveBeenCalledExactlyOnceWith({
    email: 'sami.dev@medlink.local',
    firstName: 'Sami',
    lastName: 'Dev',
    role: 'PRACTITIONER',
    specialtyId: 's1',
    clinicIds: ['c2'],
  })
})

test('when the profile lists cannot be loaded, the dialog says so and "Réessayer" brings the fields back', async () => {
  vi.mocked(api.fetchProfileChoices)
    .mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Service indisponible.'))
    .mockResolvedValueOnce(CHOICES)
  const user = renderPage()
  const dialog = await openCreate(user)

  await user.click(within(dialog).getByRole('radio', { name: 'Praticien' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('n’ont pas pu être chargées')
  expect(within(dialog).queryByLabelText('Spécialité')).not.toBeInTheDocument()

  await user.click(within(dialog).getByRole('button', { name: 'Réessayer' }))

  expect(await within(dialog).findByLabelText('Spécialité')).toBeInTheDocument()
  expect(within(dialog).getByRole('checkbox', { name: 'Clinique MedLink Sfax' })).toBeInTheDocument()
  expect(api.fetchProfileChoices).toHaveBeenCalledTimes(2)
})

test('a 400 puts each message under its own field and keeps what was typed', async () => {
  createAccount.mockRejectedValue(
    new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', {
      email: 'L’adresse e-mail n’est pas valide.',
      firstName: 'Le prénom est obligatoire.',
    }),
  )
  const user = renderPage()
  const dialog = await openCreate(user)

  await user.type(within(dialog).getByLabelText('Adresse e-mail'), 'pas-un-email')
  await user.type(within(dialog).getByLabelText('Nom'), 'Ben Ali')
  await user.click(within(dialog).getByRole('radio', { name: 'Personnel administratif' }))
  await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))

  expect(await within(dialog).findByText('L’adresse e-mail n’est pas valide.')).toBeInTheDocument()
  expect(within(dialog).getByText('Le prénom est obligatoire.')).toBeInTheDocument()
  expect(within(dialog).getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true')
  expect(within(dialog).getByLabelText('Adresse e-mail')).toHaveValue('pas-un-email')
})

test('a 409: "Un compte existe déjà avec cet e-mail" under the e-mail field', async () => {
  createAccount.mockRejectedValue(new ApiError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cette adresse e-mail.'))
  const user = renderPage()
  const dialog = await openCreate(user)

  await user.type(within(dialog).getByLabelText('Adresse e-mail'), 'sami.dev@medlink.local')
  await user.type(within(dialog).getByLabelText('Prénom'), 'Sami')
  await user.type(within(dialog).getByLabelText('Nom'), 'Dev')
  await user.click(within(dialog).getByRole('radio', { name: 'Personnel administratif' }))
  await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))

  expect(await within(dialog).findByText('Un compte existe déjà avec cet e-mail')).toBeInTheDocument()
  expect(within(dialog).getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true')
})

test('the dialog closes with "Annuler" or Escape, and the focus goes back to "Nouveau compte"', async () => {
  const user = renderPage()
  await openCreate(user)
  expect(screen.getByLabelText('Adresse e-mail')).toHaveFocus()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'Nouveau compte' })).toHaveFocus()

  const dialog = await openCreate(user)
  await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(createAccount).not.toHaveBeenCalled()
})

// ---- row actions ----

test('changes the role: practitioner to staff, then the row is read again', async () => {
  changeRole.mockResolvedValue(undefined)
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Changer le rôle')
  const dialog = screen.getByRole('dialog', { name: 'Changer le rôle de Sami Dev' })
  expect(within(dialog).getByRole('radio', { name: 'Praticien' })).toBeChecked()
  fetchAccounts.mockResolvedValue({ items: [{ ...SAMI, role: 'ADMINISTRATIVE_STAFF', roles: ['ADMINISTRATIVE_STAFF'] }], total: 1 })
  await user.click(within(dialog).getByRole('radio', { name: 'Personnel administratif' }))
  await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

  expect(changeRole).toHaveBeenCalledExactlyOnceWith('u1', { role: 'ADMINISTRATIVE_STAFF' })
  expect(await screen.findByRole('status')).toHaveTextContent('Rôle de Sami Dev changé : Personnel administratif.')
  expect(await rowOf('sami.dev@medlink.local')).toHaveTextContent('Personnel administratif')
})

test('becoming a practitioner asks for the specialty and clinics', async () => {
  changeRole.mockResolvedValue(undefined)
  const user = renderPage()
  const row = await rowOf('nour@medlink.local')

  await choose(user, row, 'Nour Admin', 'Changer le rôle')
  const dialog = screen.getByRole('dialog', { name: 'Changer le rôle de Nour Admin' })
  await user.click(within(dialog).getByRole('radio', { name: 'Praticien' }))
  await user.selectOptions(await within(dialog).findByLabelText('Spécialité'), 'Médecine générale')
  await user.click(within(dialog).getByRole('checkbox', { name: 'Clinique MedLink Sousse' }))
  await user.click(within(dialog).getByRole('checkbox', { name: 'Clinique MedLink Sfax' }))
  await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

  expect(changeRole).toHaveBeenCalledExactlyOnceWith('u2', {
    role: 'PRACTITIONER',
    specialtyId: 's2',
    clinicIds: ['c1', 'c2'],
  })
})

test('a refused role change (409) is shown in the dialog, which stays open', async () => {
  changeRole.mockRejectedValue(
    new ApiError(409, 'PRACTITIONER_HAS_SLOTS', 'Ce praticien a des créneaux : son rôle ne peut pas être changé.'),
  )
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Changer le rôle')
  const dialog = screen.getByRole('dialog', { name: 'Changer le rôle de Sami Dev' })
  await user.click(within(dialog).getByRole('radio', { name: 'Personnel administratif' }))
  await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

  expect(await within(dialog).findByText('Ce praticien a des créneaux : son rôle ne peut pas être changé.')).toBeInTheDocument()
})

test('a patient’s role cannot be changed: no such action in their menu', async () => {
  const user = renderPage()
  const row = await rowOf('amel@example.com')

  const menu = await openMenu(user, row, 'Amel Patient')
  expect(within(menu).queryByRole('menuitem', { name: /Changer le rôle/ })).toBeNull()
  expect(within(menu).getByRole('menuitem', { name: /^Désactiver le compte/ })).toBeInTheDocument()
})

test('disabling asks first; "Annuler" changes nothing', async () => {
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Désactiver le compte')
  const confirm = screen.getByRole('alertdialog', { name: 'Désactiver le compte de Sami Dev ?' })
  expect(confirm).toHaveTextContent('ne pourra plus se connecter')
  await user.click(within(confirm).getByRole('button', { name: 'Annuler' }))

  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(setAccountEnabled).not.toHaveBeenCalled()
})

test('disabling once confirmed: PATCH enabled=false, a message, the row shows "Désactivé"', async () => {
  setAccountEnabled.mockResolvedValue(undefined)
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Désactiver le compte')
  fetchAccounts.mockResolvedValue({ items: [{ ...SAMI, enabled: false }], total: 1 })
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Désactiver' }))

  expect(setAccountEnabled).toHaveBeenCalledExactlyOnceWith('u1', false)
  expect(await screen.findByRole('status')).toHaveTextContent('Le compte de Sami Dev est désactivé.')
  const updated = await rowOf('sami.dev@medlink.local')
  expect(updated).toHaveTextContent('Désactivé')
  expect(within(await openMenu(user, updated, 'Sami Dev')).getByRole('menuitem', { name: /^Activer le compte/ })).toBeInTheDocument()
})

test('enabling a disabled account, after its confirmation', async () => {
  setAccountEnabled.mockResolvedValue(undefined)
  fetchAccounts.mockResolvedValue({ items: [{ ...SAMI, enabled: false }], total: 1 })
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Activer le compte')
  await user.click(within(screen.getByRole('alertdialog', { name: 'Activer le compte de Sami Dev ?' })).getByRole('button', { name: 'Activer' }))

  expect(setAccountEnabled).toHaveBeenCalledExactlyOnceWith('u1', true)
  expect(await screen.findByRole('status')).toHaveTextContent('Le compte de Sami Dev est activé.')
})

test('a staff member cannot disable their own account from here', async () => {
  const user = renderPage()
  const row = await rowOf('staff.dev@medlink.local')

  expect(within(await openMenu(user, row, 'Salma Staff')).queryByRole('menuitem', { name: /Désactiver/ })).toBeNull()
})

// ---- the row's menu ----

test('the "⋯" button opens a menu named after the person, with their e-mail, then the actions, the risky one last', async () => {
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')
  const button = within(row).getByRole('button', { name: 'Actions pour Sami Dev' })
  expect(button).toHaveAttribute('aria-haspopup', 'menu')
  expect(button).toHaveAttribute('aria-expanded', 'false')

  const menu = await openMenu(user, row, 'Sami Dev')

  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(menu).toHaveTextContent('sami.dev@medlink.local')
  expect(within(menu).getAllByRole('menuitem').map((item) => item.querySelector('[data-label]')?.textContent)).toEqual([
    'Changer le rôle',
    'Forcer un nouveau mot de passe',
    'Modifier le nom',
    'Désactiver le compte',
  ])
  // The keyboard lands on the first action
  expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus()
})

test('the menu follows the arrow keys, and Escape closes it, the focus back on its button', async () => {
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')
  const menu = await openMenu(user, row, 'Sami Dev')
  const items = within(menu).getAllByRole('menuitem')

  await user.keyboard('{ArrowDown}')
  expect(items[1]).toHaveFocus()
  await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
  expect(items[0]).toHaveFocus()
  await user.keyboard('{ArrowUp}')
  expect(items[3]).toHaveFocus()
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('menu')).toBeNull()
  expect(within(row).getByRole('button', { name: 'Actions pour Sami Dev' })).toHaveFocus()
})

test('a click outside closes the menu; one menu at a time', async () => {
  const user = renderPage()
  await openMenu(user, await rowOf('sami.dev@medlink.local'), 'Sami Dev')
  await openMenu(user, await rowOf('nour@medlink.local'), 'Nour Admin')
  expect(screen.getAllByRole('menu')).toHaveLength(1)

  await user.click(screen.getByRole('heading', { name: 'Gestion des comptes' }))

  expect(screen.queryByRole('menu')).toBeNull()
})

test('forcing a password change, after its confirmation', async () => {
  forcePasswordReset.mockResolvedValue(undefined)
  const user = renderPage()
  const row = await rowOf('nour@medlink.local')

  await choose(user, row, 'Nour Admin', 'Forcer un nouveau mot de passe')
  const confirm = screen.getByRole('alertdialog', { name: 'Forcer le changement de mot de passe de Nour Admin ?' })
  await user.click(within(confirm).getByRole('button', { name: 'Forcer le changement' }))

  expect(forcePasswordReset).toHaveBeenCalledExactlyOnceWith('u2')
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Nour Admin devra choisir un nouveau mot de passe à sa prochaine connexion.',
  )
})

test('an action that fails says so, and the list stays as it was', async () => {
  setAccountEnabled.mockRejectedValue(new ApiError(503, 'KEYCLOAK_UNAVAILABLE', 'Le service de connexion ne répond pas.'))
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Désactiver le compte')
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Désactiver' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Le service de connexion ne répond pas.')
  expect(await rowOf('sami.dev@medlink.local')).toHaveTextContent('Actif')
})

test('edits the account name without changing the email and reloads the row', async () => {
  const updateName = vi.mocked(api.updateName)
  updateName.mockResolvedValue(undefined)
  const user = renderPage()
  const row = await rowOf('sami.dev@medlink.local')

  await choose(user, row, 'Sami Dev', 'Modifier le nom')
  const dialog = within(screen.getByRole('dialog', { name: 'Modifier le nom de Sami Dev' }))
  const firstName = dialog.getByRole('textbox', { name: 'Prénom' })
  await user.clear(firstName)
  await user.type(firstName, '  Karim  ')
  fetchAccounts.mockResolvedValue({ items: [{ ...SAMI, firstName: 'Karim' }], total: 1 })
  await user.click(dialog.getByRole('button', { name: 'Enregistrer' }))

  expect(updateName).toHaveBeenCalledExactlyOnceWith('u1', { firstName: 'Karim', lastName: 'Dev' })
  await waitFor(async () => expect(await rowOf('sami.dev@medlink.local')).toHaveTextContent('Karim'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
