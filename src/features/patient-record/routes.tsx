import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { PatientRecordPage } from './pageChunks'

/** The record page of the practitioner's space (MLink-31): app/routes.tsx puts it under the PRACTITIONER guard. */
export const practitionerRecordPages: RouteObject[] = [
  { path: `${paths.practitioner.patients}/:patientId`, element: <PatientRecordPage /> },
]
