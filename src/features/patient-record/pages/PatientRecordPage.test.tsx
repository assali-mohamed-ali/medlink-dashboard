import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import type { PatientRecord } from '../types'
import PatientRecordPage from './PatientRecordPage'

// MLink-31 (31.4): the record of a patient the practitioner has an appointment with. The API is mocked at the
// feature's api.ts; "now" is fixed (11 November 2026) so the age holds.
vi.mock('../api', () => ({ fetchPatientRecord: vi.fn() }))
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
  expect(within(identity).getByText('12 mars 1985 (41 ans)')).toBeInTheDocument()
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
  expect(within(reports).getByText('Aucun compte-rendu')).toBeInTheDocument()
})

test('says it is loading, then shows the record', async () => {
  let answer: (record: PatientRecord) => void = () => {}
  fetchPatientRecord.mockReturnValue(new Promise((resolve) => (answer = resolve)))
  renderPage()

  expect(screen.getByRole('status')).toHaveTextContent('Chargement du dossier…')
  answer(RECORD)
  expect(await screen.findByRole('heading', { name: 'Ahmed Kacem', level: 2 })).toBeInTheDocument()
})

test('a patient who is not theirs (403) gets a French message and a way back to the agenda, nothing of the record', async () => {
  const user = userEvent.setup()
  fetchPatientRecord.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Access Denied'))
  renderPage('p9')

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Ce dossier n’est pas accessible : ce patient n’a pas de rendez-vous avec vous.',
  )
  expect(screen.queryByRole('region', { name: 'Identité du patient' })).toBeNull()
  await user.click(screen.getByRole('link', { name: /Retour à l’agenda/ }))
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
