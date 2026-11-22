import { lazy } from 'react'
// Public API of the agenda feature (epic MLink-10, story MLink-26): the practitioner's pages, loaded lazily.
export { practitionerAgendaPages } from './routes'
// The practitioner's home, loaded lazily: app/routes.tsx imports this file, so a static export would put the home in
// the first visit's JavaScript (scripts/budget.mjs)
export const PractitionerHome = lazy(() => import('./pages/PractitionerHome'))
