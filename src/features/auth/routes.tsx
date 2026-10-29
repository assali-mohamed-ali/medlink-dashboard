import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'
import { GuestOnly } from './guards'

/** The auth feature's public pages. A logged-in person who opens one goes to their space. */
export const authRoutes: RouteObject[] = [
  {
    element: <GuestOnly />,
    children: [
      { path: paths.login, lazy: lazyPage(() => import('./pages/LoginPage')) },
      { path: paths.signup, lazy: lazyPage(() => import('./pages/SignupPage')) },
    ],
  },
  // Opened from a mail, logged in or not
  { path: paths.verifyEmail, lazy: lazyPage(() => import('./pages/VerifyEmailPage')) },
]
