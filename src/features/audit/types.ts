/** One row of GET /api/admin/audit-entries (api-MedLink MLink-115): a safe, read-only view of an audit entry. */
export type AuditEntry = {
  id: string
  /** ISO-8601 instant (UTC). */
  timestamp: string
  userId: string | null
  /** The API's AuditAction (e.g. LOGIN): it may gain values, so the front keeps it as text. */
  action: string
  resourceType: string | null
  /** An id only: the API never puts a name, an e-mail or a medical value here. */
  resourceId: string | null
  ipAddress: string | null
  outcome: string
}

export type AuditPage = {
  items: AuditEntry[]
  /** Zero-based page number. */
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** The filters of the API: dates are ISO-8601 instants, both ends included. */
export type AuditFilters = {
  from?: string
  to?: string
  userId?: string
  action?: string
}

export type AuditQuery = AuditFilters & { page?: number; size?: number }
