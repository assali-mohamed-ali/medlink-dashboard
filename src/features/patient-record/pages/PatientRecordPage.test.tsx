import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { PatientRecord } from '../types'
import PatientRecordPage from './PatientRecordPage'

// MLink-31 (31.4): the record of a patient the practitioner has an appointment with. The API is mocked at the
// feature's api.ts; "now" is fixed (11 November 2026) so the age holds.
vi.mock('../api', () => ({ fetchPatientRecord: vi.fn(), fetchReports: vi.fn(), createReport: vi.fn() }))
const fetchPatientRecord = vi.mocked(api.fetchPatientRecord)

const RECORD: PatientRecord = {
  patient: { id: 'p1', firstName: 'Ahmed', lastName: 'Kacem', birthDate: '1985-03-12', phone: '+216 22 333 444' },
  reports: [],
}

function renderPage(id = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/praticien/patients/${id}`]}>
      <Routes>
        <Route path="/praticien/patients/:patientId" element={<PatientRecordPage />} />
        <Route path="/praticien/agenda" element={<h2>Agenda</h2>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-11T09:00:00Z'))
  fetchPatientRecord.mockResolvedValue(RECORD)
  vi.mocked(api.fetchReports).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('shows the patient’s identity: name, birth date with age, phone', async () => {
  renderPage()

  expect(await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })).toBeInTheDocument()
  expect(fetchPatientRecord).toHaveBeenCalledExactlyOnceWith('p1')
  const identity = screen.getByRole('region', { name: 'Identité du patient' })
  expect(within(identity).getByText('12 mars 1985')).toBeInTheDocument()
  expect(within(identity).getByText('41 ans')).toBeInTheDocument()
  expect(within(identity).getByText('+216 22 333 444')).toBeInTheDocument()
})

test('a patient without a phone says so, no empty line', async () => {
  fetchPatientRecord.mockResolvedValue({ ...RECORD, patient: { ...RECORD.patient, phone: null } })
  renderPage()

  const identity = await screen.findByRole('region', { name: 'Identité du patient' })
  expect(within(identity).getByText('Non renseigné')).toBeInTheDocument()
})

test('no report yet: "Aucun compte-rendu"', async () => {
  renderPage()

  const reports = await screen.findByRole('region', { name: 'Comptes-rendus' })
  expect(await within(reports).findByText('Aucun compte-rendu')).toBeInTheDocument()
})

test('says it is loading, then shows the record', async () => {
  let answer: (record: PatientRecord) => void = () => {}
  fetchPatientRecord.mockReturnValue(new Promise((resolve) => (answer = resolve)))
  renderPage()

  expect(screen.getByRole('status')).toHaveTextContent('Chargement du dossier…')
  answer(RECORD)
  expect(await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })).toBeInTheDocument()
})

test('a patient who is not theirs (403) gets the "Accès refusé" screen (16.5) with a way back to the agenda, no data', async () => {
  const user = userEvent.setup()
  fetchPatientRecord.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Access Denied'))
  renderPage('p9')

  expect(await screen.findByRole('heading', { name: 'Accès refusé', level: 2 })).toBeInTheDocument()
  expect(screen.getByText('Ce patient n’est pas rattaché à votre agenda.')).toBeInTheDocument()
  // Nothing of a record, and nothing to try again: the answer will not change
  expect(screen.queryByRole('region', { name: 'Identité du patient' })).toBeNull()
  expect(screen.queryByRole('region', { name: 'Comptes-rendus' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull()
  // Inside the space's layout: no second main landmark
  expect(screen.queryByRole('main')).toBeNull()

  await user.click(screen.getByRole('link', { name: 'Retour à l’agenda' }))
  expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument()
})

test('another error shows the API message and a way to try again', async () => {
  const user = userEvent.setup()
  fetchPatientRecord.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.'))
  renderPage()

  expect(await screen.findByRole('alert')).toHaveTextContent('Connexion impossible.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })).toBeInTheDocument()
  expect(fetchPatientRecord).toHaveBeenCalledTimes(2)
})

test('the record is never kept in the browser’s storage', async () => {
  const local = vi.spyOn(Storage.prototype, 'setItem')
  renderPage()

  await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })
  expect(local).not.toHaveBeenCalled()
})

// ---- The Stitch "Dossier patient" design: header, breadcrumb and the four facts at a glance ----

test('the header: a breadcrumb back to the agenda, the name, "Rattaché à votre agenda", the age and the birth date', async () => {
  renderPage()

  await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })
  const crumbs = screen.getByRole('navigation', { name: 'Fil d’Ariane' })
  expect(within(crumbs).getByRole('link', { name: 'Retour à l’agenda' })).toHaveAttribute('href', '/praticien/agenda')
  expect(within(crumbs).getByText('Dossier patient')).toHaveAttribute('aria-current', 'page')
  expect(screen.getByText('Rattaché à votre agenda')).toBeInTheDocument()
  expect(screen.getByText('41 ans · né(e) le 12 mars 1985')).toBeInTheDocument()
})

test('four facts at a glance, all from the API: age, number of reports, the latest one, encryption', async () => {
  vi.mocked(api.fetchReports).mockResolvedValue([
    { id: 'r1', createdAt: '2026-10-02T08:30:00Z', content: 'Bilan annuel.' },
    { id: 'r2', createdAt: '2026-11-11T08:15:00Z', content: 'Contrôle.' },
  ])
  renderPage()

  const facts = await screen.findByRole('list', { name: 'En bref' })
  const items = within(facts).getAllByRole('listitem')
  expect(items).toHaveLength(4)
  expect(items[0]).toHaveTextContent('Âge41 ans')
  await waitFor(() => expect(items[1]).toHaveTextContent('Comptes-rendus2'))
  expect(items[2]).toHaveTextContent('Dernier compte-rendu11 novembre 2026 à 09:15')
  expect(items[3]).toHaveTextContent('ConfidentialitéChiffré')
})

test('no report yet: the facts say "Aucun" for the latest one', async () => {
  renderPage()

  const facts = await screen.findByRole('list', { name: 'En bref' })
  await waitFor(() => expect(within(facts).getAllByRole('listitem')[2]).toHaveTextContent('Dernier compte-renduAucun'))
})

test('the yellow "Nouveau compte-rendu" is in the page header and opens the editor in the reports card', async () => {
  const user = userEvent.setup()
  renderPage()

  const button = await screen.findByRole('button', { name: 'Nouveau compte-rendu' })
  expect(button).toHaveAttribute('aria-expanded', 'false')
  await user.click(button)
  const reports = screen.getByRole('region', { name: 'Comptes-rendus' })
  expect(within(reports).getByRole('form', { name: 'Nouveau compte-rendu' })).toBeInTheDocument()
  expect(button).toHaveAttribute('aria-expanded', 'true')
})
