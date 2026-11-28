import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

export const patientReassignmentPages: RouteObject[] = [
  { path: paths.patient.reassignments, lazy: lazyPage(() => import('./pages/PatientReassignmentsPage')) },
]
export const practitionerReassignmentPages: RouteObject[] = [
  { path: paths.practitioner.reassignments, lazy: lazyPage(() => import('./pages/PractitionerReassignmentsPage')) },
]
export const staffReassignmentPages: RouteObject[] = [
  { path: paths.staff.reassignments, lazy: lazyPage(() => import('./pages/StaffReassignmentsPage')) },
]
