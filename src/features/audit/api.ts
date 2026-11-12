import { apiFetch } from '@/shared/api/apiClient'
import type { AuditPage, AuditQuery } from './types'

const PARAMS = ['page', 'size', 'from', 'to', 'userId', 'action'] as const

/** GET /api/admin/audit-entries (staff only, newest first). Empty filters are not sent. */
export function fetchAuditEntries(query: AuditQuery = {}) {
  const params = new URLSearchParams()
  for (const key of PARAMS) {
    const value = query[key]
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return apiFetch<AuditPage>(`/admin/audit-entries${search ? `?${search}` : ''}`)
}
