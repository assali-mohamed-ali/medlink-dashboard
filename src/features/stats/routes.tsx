import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** The anonymised statistics page, inside the administrative staff's space (MLink-95). */
export const staffStatsPages: RouteObject[] = [
  { path: paths.staff.stats, lazy: lazyPage(() => import('./pages/StatsExportPage')) },
]
