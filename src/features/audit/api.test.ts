import { beforeEach, expect, test, vi } from 'vitest'
import { apiFetch } from '@/shared/api/apiClient'
import { fetchAuditEntries } from './api'

vi.mock('@/shared/api/apiClient', () => ({ apiFetch: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
})

test('asks for a page with all the filters it is given', async () => {
  await fetchAuditEntries({
    page: 2,
    size: 50,
    from: '2026-11-01T00:00:00.000Z',
    to: '2026-11-02T23:59:59.999Z',
    userId: '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b',
    action: 'LOGIN',
  })
  expect(apiFetch).toHaveBeenCalledWith(
    '/admin/audit-entries?page=2&size=50&from=2026-11-01T00%3A00%3A00.000Z&to=2026-11-02T23%3A59%3A59.999Z&userId=3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b&action=LOGIN',
  )
})

test('does not send empty filters, and keeps page 0', async () => {
  await fetchAuditEntries({ page: 0, size: 50, userId: '', action: '' })
  expect(apiFetch).toHaveBeenCalledWith('/admin/audit-entries?page=0&size=50')
})

test('with no query at all, asks for the first page the API gives', async () => {
  await fetchAuditEntries()
  expect(apiFetch).toHaveBeenCalledWith('/admin/audit-entries')
})
