import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** Pages of the patient's space (MLink-101, MLink-109): app/routes.tsx puts them under the PATIENT guard and layout. */
export const patientSlotPages: RouteObject[] = [
  { path: paths.patient.slots, lazy: lazyPage(() => import('./pages/SlotSearchPage')) },
  { path: paths.patient.appointments, lazy: lazyPage(() => import('./pages/MyAppointmentsPage')) },
]
