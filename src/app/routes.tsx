import type { RouteObject } from 'react-router-dom'
import { RequireAuth, authRoutes, type Role } from '@/features/auth'
import { mfaRoutes } from '@/features/mfa'
import AccessDeniedPage from '@/pages/AccessDeniedPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PlaceholderPage from '@/pages/PlaceholderPage'
import RouteErrorPage from '@/pages/RouteErrorPage'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'
import SpaceHome from '@/spaces/SpaceHome'
import SpaceLayout from '@/spaces/SpaceLayout'

/**
 * A role's space: one guard and one layout for the whole branch, so no page of the space can forget the
 * role check. Its pages are the children (absolute paths under the space's root).
 */
function space(role: Role, root: string, pages: RouteObject[] = []): RouteObject {
  return {
    path: root,
    element: (
      <RequireAuth role={role}>
        <SpaceLayout role={role} />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [{ index: true, element: <SpaceHome /> }, ...pages],
  }
}

/** The whole route table. Wiring only: each feature brings its own routes. */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: paths.home, lazy: lazyPage(() => import('@/pages/HomePage')) },
      ...authRoutes,
      ...mfaRoutes,
      // Pages of flows still to build (MLink-89, MLink-71)
      { path: paths.password, element: <PlaceholderPage title="Mot de passe" /> },
      { path: paths.activateAccount, element: <PlaceholderPage title="Activation du compte" /> },
      { path: paths.accessDenied, element: <AccessDeniedPage /> },

      space('PATIENT', paths.patient.root),
      space('PRACTITIONER', paths.practitioner.root),
      space('ADMINISTRATIVE_STAFF', paths.staff.root, [
        // MLink-73 (back-office) replaces this placeholder
        { path: paths.staff.accounts, element: <PlaceholderPage title="Gestion des comptes" /> },
      ]),

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
