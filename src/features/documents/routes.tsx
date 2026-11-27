import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** The patient's own documents, inside the patient space (MLink-123/125). */
export const patientDocumentPages: RouteObject[] = [
  { path: paths.patient.documents, lazy: lazyPage(() => import('./pages/PatientDocumentsPage')) },
]

/** The staff's patient-documents page, inside the administrative space (MLink-123/125). */
export const staffDocumentPages: RouteObject[] = [
  { path: paths.staff.documents, lazy: lazyPage(() => import('./pages/StaffDocumentsPage')) },
]
