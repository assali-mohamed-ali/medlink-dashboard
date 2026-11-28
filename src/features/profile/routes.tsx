import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { PatientProfilePage, ProfilePage, StaffProfilePage } from './pageChunks'

/** The profile page of the practitioner's space: app/routes.tsx puts it under the PRACTITIONER guard and layout. */
export const practitionerProfilePages: RouteObject[] = [{ path: paths.practitioner.profile, element: <ProfilePage /> }]

/** The profile page of the patient's space, the same way: under the PATIENT guard and layout. */
export const patientProfilePages: RouteObject[] = [{ path: paths.patient.profile, element: <PatientProfilePage /> }]

/** The profile page of the staff's space, the same way: under the ADMINISTRATIVE_STAFF guard and layout. */
export const staffProfilePages: RouteObject[] = [{ path: paths.staff.profile, element: <StaffProfilePage /> }]
