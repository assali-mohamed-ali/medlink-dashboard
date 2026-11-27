import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** "Rendez-vous des cliniques", inside the administrative staff's space (MLink-35): a chunk of its own. */
export const staffSupervisionPages: RouteObject[] = [
  { path: paths.staff.activity, lazy: lazyPage(() => import('./pages/ClinicActivityPage')) },
]
