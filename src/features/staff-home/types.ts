// What the staff's home reads (api-MedLink, ADMINISTRATIVE_STAFF only): only the fields it shows.

/** One account of GET /api/admin/users, as far as the home counts it. */
export type OverviewAccount = {
  id: string
  role: 'PATIENT' | 'PRACTITIONER' | 'ADMINISTRATIVE_STAFF' | null
  enabled: boolean
  emailVerified: boolean
  ambiguousRole: boolean
}

export type AccountsOverview = { items: OverviewAccount[]; total: number }

/** One practitioner of GET /api/admin/practitioners (MLink-35): the clinics they work in. */
export type OverviewPractitioner = { id: string; clinics: { id: string; name: string }[] }

/** One row of GET /api/admin/audit-entries (MLink-115): ids only, never a name or a medical value. */
export type AuditEntry = {
  id: string
  timestamp: string
  action: string
  outcome: string
  resourceType: string | null
  resourceId: string | null
}

export type AuditPage = { items: AuditEntry[]; page: number; size: number; totalElements: number; totalPages: number }

export type AuditQuery = { from?: string; action?: string; size: number }
