import { beforeEach, expect, test, vi } from 'vitest'
import { apiFetch } from '@/shared/api/apiClient'
import { fetchProfileChoices } from './api'

vi.mock('@/shared/api/apiClient', () => ({ apiFetch: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

// MLink-69: the patients' slot search lists (/slots/filters) refuse staff, so no practitioner could be created
test("reads a practitioner profile's lists from the staff endpoint, not from the patients' slot search", async () => {
  const choices = {
    clinics: [{ id: 'c1', name: 'Clinique Les Jasmins', city: 'Tunis' }],
    specialties: [{ id: 's1', name: 'Cardiologie' }],
  }
  vi.mocked(apiFetch).mockResolvedValue(choices)

  await expect(fetchProfileChoices()).resolves.toEqual(choices)
  expect(apiFetch).toHaveBeenCalledWith('/admin/profile-choices')
})
