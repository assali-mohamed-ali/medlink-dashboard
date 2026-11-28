import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** The patient's consultation reports, inside the patient's space (MLink-32 follow-up). */
export const patientReportPages: RouteObject[] = [
  { path: paths.patient.reports, lazy: lazyPage(() => import('./pages/MyReportsPage')) },
]
