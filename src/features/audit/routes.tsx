import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** The audit log page, inside the administrative staff's space (MLink-116). */
export const staffAuditPages: RouteObject[] = [
  { path: paths.staff.audit, lazy: lazyPage(() => import('./pages/AuditLogPage')) },
]