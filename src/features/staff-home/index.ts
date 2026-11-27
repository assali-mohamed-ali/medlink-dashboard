import { lazy } from 'react'

// Public API of the staff's home. Loaded lazily: app/routes.tsx reaches this file through the spaces, so a static
// export would put the home in the first visit's JavaScript (scripts/budget.mjs)
export const StaffHome = lazy(() => import('./pages/StaffHome'))
