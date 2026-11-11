import { lazy } from 'react'

// Lazy like the agenda's (see features/agenda/pageChunks.ts): the page downloads the first time it opens.
export const PatientRecordPage = lazy(() => import('./pages/PatientRecordPage'))
