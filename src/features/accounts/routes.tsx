import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'
import { AccountsPage } from './pageChunks'

/** The back-office page (MLink-73): app/routes.tsx puts it under the ADMINISTRATIVE_STAFF guard. */
export const staffAccountsPages: RouteObject[] = [
  { path: paths.staff.accounts, element: <AccountsPage /> },
  { path: paths.staff.clinicAssignments, lazy: lazyPage(() => import("./pages/ClinicAssignmentsPage")) },
  { path: paths.staff.deletionRequests, lazy: lazyPage(() => import("./pages/DeletionRequestsPage")) },
]
