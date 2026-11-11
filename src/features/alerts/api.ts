import { apiFetch } from '@/shared/api/apiClient'
import type { Alert } from './types'

// One function per endpoint (api-MedLink, MLink-37). Components never call fetch() themselves.

/** The caller's unread alerts, newest first. */
export function fetchUnreadAlerts() {
  return apiFetch<Alert[]>('/practitioner/alerts?unread=true')
}

/** Marks one of the caller's alerts as read: 204, or 403 for an alert that is not theirs. */
export function markAlertRead(alertId: string) {
  return apiFetch<void>(`/practitioner/alerts/${encodeURIComponent(alertId)}/read`, { method: 'POST' })
}
