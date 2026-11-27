import { apiFetch } from '@/shared/api/apiClient'
import type { AccountsOverview, AuditPage, AuditQuery, OverviewPractitioner } from './types'

// One function per endpoint the staff's home reads (ADMINISTRATIVE_STAFF only). Components never call fetch().

/** The accounts the API gives at most in one page: the home counts them. */
export const ACCOUNTS_PAGE = 100

/** GET /api/admin/users, the first page of every account, and the total. */
export function fetchAccountsOverview() {
  const query = new URLSearchParams({ search: '', page: '0', size: String(ACCOUNTS_PAGE) })
  return apiFetch<AccountsOverview>(`/admin/users?${query}`)
}

/** GET /api/admin/practitioners (MLink-35): every practitioner with their clinics. */
export function fetchPractitioners() {
  return apiFetch<OverviewPractitioner[]>('/admin/practitioners')
}

/** GET /api/admin/audit-entries, newest first. */
export function fetchAuditEntries(query: AuditQuery) {
  const params = new URLSearchParams()
  if (query.from) params.set('from', query.from)
  if (query.action) params.set('action', query.action)
  params.set('size', String(query.size))
  return apiFetch<AuditPage>(`/admin/audit-entries?${params}`)
}
