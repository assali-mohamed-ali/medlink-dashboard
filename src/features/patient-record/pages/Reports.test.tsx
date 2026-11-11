import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { Report } from '../types'
import PatientRecordPage from './PatientRecordPage'

// MLink-32 (32.5, 32.6): the practitioner writes a consultation report from the patient record; a failed save never
// loses the text. The API is mocked at the feature's api.ts; dates are shown in Tunis time.
vi.mock('../api', () => ({ fetchPatientRecord: vi.fn(), fetchReports: vi.fn(), createReport: vi.fn() }))
const fetchReports = vi.mocked(api.fetchReports)
const createReport = vi.mocked(api.createReport)

const TEXT = 'Douleur thoracique atypique, ECG normal. Contrôle dans un mois.'
const OLD: Report = { id: 'r1', createdAt: '2026-10-02T08:30:00Z', content: 'Bilan annuel sans particularité.' }
const NEW: Report = { id: 'r2', createdAt: '2026-11-11T09:15:00Z', content: TEXT }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/praticien/patients/p1']}>
      <Routes>
        <Route path="/praticien/patients/:patientId" element={<PatientRecordPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function reportsRegion() {
  return screen.findByRole('region', { name: 'Comptes-rendus' })
}

async function openEditor() {
  const user = userEvent.setup()
  renderPage()
  const region = await reportsRegion()
  await user.click(within(region).getByRole('button', { name: 'Nouveau compte-rendu' }))
  return { user, region, editor: within(region).getByRole('form', { name: 'Nouveau compte-rendu' }) }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.fetchPatientRecord).mockResolvedValue({
    patient: { id: 'p1', firstName: 'Ahmed', lastName: 'Kacem', birthDate: '1985-03-12', phone: null },
    reports: [],
  })
  fetchReports.mockResolvedValue([OLD])
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('lists the saved reports, newest first: date in Tunis time and the start of the text', async () => {
  const long: Report = { id: 'r3', createdAt: '2026-11-05T15:00:00Z', content: 'x'.repeat(300) }
  fetchReports.mockResolvedValue([OLD, long])
  renderPage()

  const list = await within(await reportsRegion()).findByRole('list', { name: 'Comptes-rendus enregistrés' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('5 novembre 2026 à 16:00')
  expect(items[0]).toHaveTextContent(`${'x'.repeat(160)}…`)
  expect(items[0]).not.toHaveTextContent('x'.repeat(161))
  expect(items[1]).toHaveTextContent('2 octobre 2026 à 09:30')
  expect(items[1]).toHaveTextContent('Bilan annuel sans particularité.')
  expect(fetchReports).toHaveBeenCalledWith('p1')
})

test('no report yet: "Aucun compte-rendu"', async () => {
  fetchReports.mockResolvedValue([])
  renderPage()

  expect(await within(await reportsRegion()).findByText('Aucun compte-rendu')).toBeInTheDocument()
})

test('"Nouveau compte-rendu" opens the editor; "Enregistrer" sends the text, then the list is read again and shows it', async () => {
  createReport.mockResolvedValue(NEW)
  const { user, region, editor } = await openEditor()
  fetchReports.mockResolvedValue([OLD, NEW])

  await user.type(within(editor).getByLabelText('Compte-rendu'), TEXT)
  await user.click(within(editor).getByRole('button', { name: 'Enregistrer' }))

  expect(createReport).toHaveBeenCalledExactlyOnceWith('p1', { content: TEXT })
  expect(await within(region).findByText('Compte-rendu enregistré.')).toBeInTheDocument()
  expect(within(region).queryByRole('form', { name: 'Nouveau compte-rendu' })).toBeNull()
  const list = within(region).getByRole('list', { name: 'Comptes-rendus enregistrés' })
  expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent(TEXT)
  expect(fetchReports).toHaveBeenCalledTimes(2)
})

test('an empty report is not sent', async () => {
  const { user, editor } = await openEditor()

  await user.type(within(editor).getByLabelText('Compte-rendu'), '   ')
  await user.click(within(editor).getByRole('button', { name: 'Enregistrer' }))

  expect(within(editor).getByText('Écrivez le compte-rendu avant de l’enregistrer.')).toBeInTheDocument()
  expect(within(editor).getByLabelText('Compte-rendu')).toHaveAttribute('aria-invalid', 'true')
  expect(createReport).not.toHaveBeenCalled()
})

test('a double click saves the report once', async () => {
  createReport.mockReturnValue(new Promise(() => {}))
  const { user, editor } = await openEditor()

  await user.type(within(editor).getByLabelText('Compte-rendu'), TEXT)
  await user.dblClick(within(editor).getByRole('button', { name: /Enregistrer/ }))

  expect(createReport).toHaveBeenCalledTimes(1)
  expect(within(editor).getByRole('button', { name: /Enregistrer/ })).toBeDisabled()
})

test('32.6: a failed save keeps the draft, says so in French with the API message, and "Réessayer" sends it again', async () => {
  createReport
    .mockRejectedValueOnce(new ApiError(500, 'REPORT_SAVE_FAILED', 'Le compte-rendu n’a pas pu être enregistré.'))
    .mockResolvedValueOnce(NEW)
  const { user, region, editor } = await openEditor()

  await user.type(within(editor).getByLabelText('Compte-rendu'), TEXT)
  await user.click(within(editor).getByRole('button', { name: 'Enregistrer' }))

  const alert = await within(editor).findByRole('alert')
  expect(alert).toHaveTextContent('Enregistrement impossible, votre brouillon est conservé.')
  expect(alert).toHaveTextContent('Le compte-rendu n’a pas pu être enregistré.')
  expect(within(editor).getByLabelText('Compte-rendu')).toHaveValue(TEXT)

  fetchReports.mockResolvedValue([OLD, NEW])
  await user.click(within(editor).getByRole('button', { name: 'Réessayer' }))

  expect(createReport).toHaveBeenCalledTimes(2)
  expect(createReport).toHaveBeenLastCalledWith('p1', { content: TEXT })
  expect(await within(region).findByText('Compte-rendu enregistré.')).toBeInTheDocument()
})

test('32.6: a network failure keeps the draft too', async () => {
  createReport.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  const { user, editor } = await openEditor()

  await user.type(within(editor).getByLabelText('Compte-rendu'), TEXT)
  await user.click(within(editor).getByRole('button', { name: 'Enregistrer' }))

  expect(await within(editor).findByRole('alert')).toHaveTextContent('Enregistrement impossible, votre brouillon est conservé.')
  expect(within(editor).getByLabelText('Compte-rendu')).toHaveValue(TEXT)
  expect(within(editor).getByRole('button', { name: 'Réessayer' })).toBeEnabled()
})

test('a 400 puts the API message under the text', async () => {
  createReport.mockRejectedValue(
    new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.', { content: 'Le compte-rendu est trop long.' }),
  )
  const { user, editor } = await openEditor()

  await user.type(within(editor).getByLabelText('Compte-rendu'), TEXT)
  await user.click(within(editor).getByRole('button', { name: 'Enregistrer' }))

  await waitFor(() =>
    expect(within(editor).getByLabelText('Compte-rendu')).toHaveAccessibleDescription(/Le compte-rendu est trop long\./),
  )
  expect(within(editor).getByLabelText('Compte-rendu')).toHaveValue(TEXT)
})

test('32.6: the draft is medical data: never written to the browser’s storage, even when the save fails', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  createReport.mockRejectedValue(new ApiError(500, 'REPORT_SAVE_FAILED', 'Le compte-rendu n’a pas pu être enregistré.'))
  const { user, editor } = await openEditor()

  await user.type(within(editor).getByLabelText('Compte-rendu'), TEXT)
  await user.click(within(editor).getByRole('button', { name: 'Enregistrer' }))
  await within(editor).findByRole('alert')

  expect(storage).not.toHaveBeenCalled()
})

test('the list that cannot be read says so and offers to try again', async () => {
  const user = userEvent.setup()
  fetchReports.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderPage()

  const region = await reportsRegion()
  expect(await within(region).findByRole('alert')).toHaveTextContent('Connexion impossible.')
  await user.click(within(region).getByRole('button', { name: 'Réessayer' }))
  expect(await within(region).findByText(/Bilan annuel/)).toBeInTheDocument()
})
