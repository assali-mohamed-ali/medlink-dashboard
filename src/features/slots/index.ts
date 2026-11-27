import { lazy } from 'react'
// Public API of the slots feature (epic MLink-8): the patient's pages. Pages are loaded lazily by them.
export { patientSlotPages } from './routes'
// The patient's home, loaded lazily too: app/routes.tsx imports this file, so a static export would put the home in the
// first visit's JavaScript (scripts/budget.mjs)
export const PatientHome = lazy(() => import('./pages/PatientHome'))
