import { beforeEach, expect, test, vi } from 'vitest'
import { apiFetch } from '@/shared/api/apiClient'
import { fetchPractitionerAgenda, fetchPractitioners } from './api'

vi.mock('@/shared/api/apiClient', () => ({ apiFetch: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

// MLink-35: staff read the clinics' activity through their own endpoints (api-MedLink 16c, 16d), never the
// practitioner's /practitioner/agenda
test('lists the practitioners staff supervise', async () => {
  await fetchPractitioners()
  expect(apiFetch).toHaveBeenCalledWith('/admin/practitioners')
})

test("asks for one practitioner's agenda of a period", async () => {
  await fetchPractitionerAgenda('p1', '2026-11-29T23:00:00.000Z', '2026-12-05T23:00:00.000Z')
  expect(apiFetch).toHaveBeenCalledWith(
    '/admin/agenda?practitionerId=p1&from=2026-11-29T23%3A00%3A00.000Z&to=2026-12-05T23%3A00%3A00.000Z',
  )
})
