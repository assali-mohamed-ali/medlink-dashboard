import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { AuditEntry, AuditPage } from '../types'
import AuditLogPage from './AuditLogPage'

vi.mock('../api', () => ({ fetchAuditEntries: vi.fn() }))
const fetchAuditEntries = vi.mocked(api.fetchAuditEntries)

const USER_ID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b'

function entry(over: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'e1',
    timestamp: '2026-11-10T09:30:00Z',
    userId: USER_ID,
    action: 'LOGIN',
    resourceType: 'USER',
    resourceId: 'u-42',
    ipAddress: '10.0.0.7',
    outcome: 'SUCCESS',
    ...over,
  }
}

function pageOf(items: AuditEntry[], over: Partial<AuditPage> = {}): AuditPage {
  return { items, page: 0, size: 50, totalElements: items.length, totalPages: 1, ...over }
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('asks for the first page of 50 and shows a loader meanwhile', () => {
  fetchAuditEntries.mockReturnValue(new Promise<AuditPage>(() => {}))
  render(<AuditLogPage />)
  expect(screen.getByRole('heading', { name: "Journal d'audit" })).toBeInTheDocument()
  expect(screen.getByText("Chargement du journal d'audit…")).toBeInTheDocument()
  expect(screen.queryByRole('table')).toBeNull()
  expect(fetchAuditEntries).toHaveBeenCalledWith({ page: 0, size: 50 })
})

test('shows each entry in a table, with a dash for what is unknown', async () => {
  fetchAuditEntries.mockResolvedValue(
    pageOf([
      entry(),
      entry({
        id: 'e2',
        action: 'ACCOUNT_UPDATED',
        outcome: 'FAILURE',
        userId: null,
        resourceType: null,
        resourceId: null,
        ipAddress: null,
      }),
    ]),
  )
  render(<AuditLogPage />)
  expect(await screen.findByRole('table')).toBeInTheDocument()
  for (const name of ['Date', 'Utilisateur', 'Action', 'Ressource', 'Adresse IP', 'Résultat']) {
    expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
  }
  const rows = screen.getAllByRole('row')
  expect(rows).toHaveLength(3)
  const [, firstRow, secondRow] = rows
  const first = within(firstRow as HTMLElement)
  const second = within(secondRow as HTMLElement)
  const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
    .format(new Date('2026-11-10T09:30:00Z'))
    .replace(/\s+/g, ' ')
  expect(first.getByText(when)).toBeInTheDocument()
  expect(first.getByText(USER_ID)).toBeInTheDocument()
  expect(first.getByText('Connexion')).toBeInTheDocument()
  expect(first.getByText('USER u-42')).toBeInTheDocument()
  expect(first.getByText('10.0.0.7')).toBeInTheDocument()
  expect(first.getByText('Réussi')).toBeInTheDocument()
  expect(second.getByText('Compte modifié')).toBeInTheDocument()
  expect(second.getByText('Échec')).toBeInTheDocument()
  expect(second.getAllByText('—')).toHaveLength(3)
})

test('no entry: says so instead of showing an empty table', async () => {
  fetchAuditEntries.mockResolvedValue(pageOf([], { totalElements: 0, totalPages: 0 }))
  render(<AuditLogPage />)
  expect(await screen.findByText('Aucune entrée du journal ne correspond à ces critères.')).toBeInTheDocument()
  expect(screen.queryByRole('table')).toBeNull()
})

test('an API failure shows its message, and "Réessayer" asks again', async () => {
  fetchAuditEntries
    .mockRejectedValueOnce(new ApiError(500, 'UNKNOWN', 'Un problème est survenu de notre côté. Réessayez dans un instant.'))
    .mockResolvedValueOnce(pageOf([entry()]))
  const user = userEvent.setup()
  render(<AuditLogPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Un problème est survenu de notre côté')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('table')).toBeInTheDocument()
  expect(fetchAuditEntries).toHaveBeenCalledTimes(2)
})

test('sends the filters the person chose, from the first page', async () => {
  fetchAuditEntries.mockResolvedValue(pageOf([entry()]))
  const user = userEvent.setup()
  render(<AuditLogPage />)
  await screen.findByRole('table')
  await user.click(screen.getByLabelText("Identifiant de l'utilisateur"))
  await user.paste(USER_ID)
  await user.selectOptions(screen.getByLabelText('Action'), 'LOGIN')
  fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2026-11-01' } })
  fireEvent.change(screen.getByLabelText('Date de fin'), { target: { value: '2026-11-02' } })
  await user.click(screen.getByRole('button', { name: 'Filtrer' }))
  await waitFor(() =>
    expect(fetchAuditEntries).toHaveBeenLastCalledWith({
      page: 0,
      size: 50,
      from: new Date(2026, 10, 1, 0, 0, 0, 0).toISOString(),
      to: new Date(2026, 10, 2, 23, 59, 59, 999).toISOString(),
      userId: USER_ID,
      action: 'LOGIN',
    }),
  )
})

test('a user id that is not a UUID is refused before calling the API', async () => {
  fetchAuditEntries.mockResolvedValue(pageOf([entry()]))
  const user = userEvent.setup()
  render(<AuditLogPage />)
  await screen.findByRole('table')
  await user.click(screen.getByLabelText("Identifiant de l'utilisateur"))
  await user.paste('pas-un-uuid')
  await user.click(screen.getByRole('button', { name: 'Filtrer' }))
  expect(await screen.findByText('Saisissez un identifiant valide (UUID).')).toBeInTheDocument()
  expect(fetchAuditEntries).toHaveBeenCalledTimes(1)
})

test('an end date before the start date is refused before calling the API', async () => {
  fetchAuditEntries.mockResolvedValue(pageOf([entry()]))
  const user = userEvent.setup()
  render(<AuditLogPage />)
  await screen.findByRole('table')
  fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2026-11-05' } })
  fireEvent.change(screen.getByLabelText('Date de fin'), { target: { value: '2026-11-01' } })
  await user.click(screen.getByRole('button', { name: 'Filtrer' }))
  expect(await screen.findByText('La date de fin doit suivre la date de début.')).toBeInTheDocument()
  expect(fetchAuditEntries).toHaveBeenCalledTimes(1)
})

test('"Réinitialiser" clears the fields and asks for the unfiltered first page', async () => {
  fetchAuditEntries.mockResolvedValue(pageOf([entry()]))
  const user = userEvent.setup()
  render(<AuditLogPage />)
  await screen.findByRole('table')
  await user.selectOptions(screen.getByLabelText('Action'), 'LOGIN')
  await user.click(screen.getByRole('button', { name: 'Filtrer' }))
  await waitFor(() =>
    expect(fetchAuditEntries).toHaveBeenLastCalledWith({ page: 0, size: 50, action: 'LOGIN' }),
  )
  await user.click(screen.getByRole('button', { name: 'Réinitialiser' }))
  await waitFor(() => expect(fetchAuditEntries).toHaveBeenLastCalledWith({ page: 0, size: 50 }))
  expect(screen.getByLabelText('Action')).toHaveValue('')
})

test('pages: shows where we are, and Précédent / Suivant move one page', async () => {
  fetchAuditEntries.mockImplementation(async (query) =>
    pageOf([entry({ id: `e${query?.page ?? 0}` })], {
      page: query?.page ?? 0,
      totalPages: 3,
      totalElements: 120,
    }),
  )
  const user = userEvent.setup()
  render(<AuditLogPage />)
  expect(await screen.findByText('Page 1 sur 3')).toBeInTheDocument()
  expect(screen.getByText('120 événements')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Suivant' }))
  expect(await screen.findByText('Page 2 sur 3')).toBeInTheDocument()
  expect(fetchAuditEntries).toHaveBeenLastCalledWith({ page: 1, size: 50 })
  await user.click(screen.getByRole('button', { name: 'Précédent' }))
  expect(await screen.findByText('Page 1 sur 3')).toBeInTheDocument()
})

test('the chosen filters stay when changing page', async () => {
  fetchAuditEntries.mockImplementation(async (query) =>
    pageOf([entry()], { page: query?.page ?? 0, totalPages: 3, totalElements: 120 }),
  )
  const user = userEvent.setup()
  render(<AuditLogPage />)
  await screen.findByText('Page 1 sur 3')
  await user.selectOptions(screen.getByLabelText('Action'), 'LOGIN')
  await user.click(screen.getByRole('button', { name: 'Filtrer' }))
  await user.click(await screen.findByRole('button', { name: 'Suivant' }))
  await waitFor(() =>
    expect(fetchAuditEntries).toHaveBeenLastCalledWith({ page: 1, size: 50, action: 'LOGIN' }),
  )
})


