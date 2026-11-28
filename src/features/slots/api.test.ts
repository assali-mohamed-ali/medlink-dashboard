import { expect, test, vi } from 'vitest'
import { apiFetch } from '@/shared/api/apiClient'
import { searchBookingPatients } from './api'

vi.mock('@/shared/api/apiClient', () => ({ apiFetch: vi.fn() }))

test('staff booking excludes identity-only patients from the search page', async () => {
  const patient = {
    id: 'registered', firstName: 'Patient', lastName: 'Synthétique', email: 'test@medlink.local',
    role: 'PATIENT', enabled: true, emailVerified: true, hasPatientProfile: true,
  }
  vi.mocked(apiFetch).mockResolvedValue({
    total: 3,
    items: [
      patient,
      { ...patient, id: 'identity-only', hasPatientProfile: false },
      { ...patient, id: 'disabled', enabled: false },
    ],
  })

  await expect(searchBookingPatients('patient', 0)).resolves.toEqual({ items: [patient], total: 3 })
})
