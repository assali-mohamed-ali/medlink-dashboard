import { beforeEach, expect, test, vi } from 'vitest'
import { apiFetch, apiFetchBlob } from '@/shared/api/apiClient'
import { downloadDocument, fetchDocuments, searchPatients, uploadDocument } from './api'

vi.mock('@/shared/api/apiClient', () => ({ apiFetch: vi.fn(), apiFetchBlob: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

test('asks for one page of a patient documents', async () => {
  await fetchDocuments('p1', 2)
  expect(apiFetch).toHaveBeenCalledWith('/patients/p1/documents?page=2&size=20')
})

test('uploads a multipart title and file, never JSON', async () => {
  const file = new File(['%PDF-1.7'], 'compte-rendu.pdf', { type: 'application/pdf' })
  await uploadDocument('p1', 'Compte rendu', file)

  const [path, options] = vi.mocked(apiFetch).mock.calls[0]
  expect(path).toBe('/patients/p1/documents')
  expect(options?.method).toBe('POST')
  const body = options?.body as FormData
  expect(body).toBeInstanceOf(FormData)
  expect(body.get('title')).toBe('Compte rendu')
  expect(body.get('file')).toBe(file)
})

test('downloads a document as a blob', async () => {
  await downloadDocument('p1', 'd1')
  expect(apiFetchBlob).toHaveBeenCalledWith('/patients/p1/documents/d1')
})

test('searches the accounts and omits ambiguous accounts and patients without a profile', async () => {
  vi.mocked(apiFetch).mockResolvedValue({
    items: [
      { id: 'p1', firstName: 'Amel', lastName: 'Ben Salah', email: 'amel@example.com', role: 'PATIENT', roles: ['PATIENT'], hasPatientProfile: true },
      { id: 'dev', firstName: 'Patient', lastName: 'Dev', email: 'dev@medlink.local', role: 'PATIENT', roles: ['PATIENT'], hasPatientProfile: false },
      { id: 's1', firstName: 'Sami', lastName: 'Dev', email: 'sami@medlink.local', role: 'PRACTITIONER', roles: ['PRACTITIONER'] },
      { id: 'x1', firstName: 'Odd', lastName: 'Role', email: 'odd@medlink.local', role: null, roles: ['PATIENT', 'PRACTITIONER'] },
    ],
  })

  await expect(searchPatients('amel')).resolves.toEqual([
    { id: 'p1', firstName: 'Amel', lastName: 'Ben Salah', email: 'amel@example.com' },
  ])
  expect(apiFetch).toHaveBeenCalledWith('/admin/users?search=amel&page=0&size=100')
})
