import { apiFetch } from '@/shared/api/apiClient'
import type { MyReport } from './types'

/** The caller's own reports, newest first (patients only: 403 otherwise). Never an id in the URL. */
export function fetchMyReports() {
  return apiFetch<MyReport[]>('/reports/me')
}
