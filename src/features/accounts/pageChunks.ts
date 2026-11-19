import { lazy } from 'react'

// Lazy like the other spaces' pages: the back-office downloads the first time staff open it.
export const AccountsPage = lazy(() => import('./pages/AccountsPage'))
