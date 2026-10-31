import type { RouteObject } from 'react-router-dom'
import { GuestOnly } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'

/** The code step after the password (practitioners and staff). Nothing to do here once logged in. */
export const mfaRoutes: RouteObject[] = [
  {
    element: <GuestOnly />,
    children: [
      { path: paths.mfa, lazy: lazyPage(() => import('./pages/MfaPage')) },
      { path: paths.configureCode, lazy: lazyPage(() => import('./pages/ConfigureCodePage')) },
    ],
  },
]
