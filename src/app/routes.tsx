import { Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import { staffAccountsPages } from '@/features/accounts'
import { RequireAuth, authRoutes, ownPasswordRoute, type Role } from '@/features/auth'
import { mfaRoutes } from '@/features/mfa'
import AccessDeniedPage from '@/pages/AccessDeniedPage'
import NotFoundPage from '@/pages/NotFoundPage'
import RouteErrorPage from '@/pages/RouteErrorPage'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'
import { PageLoader } from '@/shared/ui'
import { SpaceHome, SpaceLayout } from './spaceChunks'

/**
 * A role's space: one guard and one layout for the whole branch, so no page of the space can forget the
 * role check. Its pages are the children (absolute paths under the space's root).
 */
function space(role: Role, root: string, pages: RouteObject[] = []): RouteObject {
  return {
    path: root,
    element: (
      <RequireAuth role={role}>
        <Suspense fallback={<PageLoader />}>
          <SpaceLayout role={role} />
        </Suspense>
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [{ index: true, element: <SpaceHome role={role} /> }, ...pages],
  }
}

/** The whole route table. Wiring only: each feature brings its own routes. */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    // Shown while the first page's lazy chunk downloads (a refresh on a lazy page): a loader, not a blank screen
    hydrateFallbackElement: <PageLoader />,
    children: [
      { path: paths.home, lazy: lazyPage(() => import('@/pages/HomePage')) },
      ...authRoutes,
      ...mfaRoutes,
      { path: paths.accessDenied, element: <AccessDeniedPage /> },

      // Each space has its own password page (MLink-89), so the change happens inside the space
      space('PATIENT', paths.patient.root, [ownPasswordRoute(paths.patient.password)]),
      space('PRACTITIONER', paths.practitioner.root, [ownPasswordRoute(paths.practitioner.password)]),
      space('ADMINISTRATIVE_STAFF', paths.staff.root, [
        ...staffAccountsPages,
        ownPasswordRoute(paths.staff.password),
      ]),

      // Dev-only design tool (UI refresh B0). import.meta.env.DEV is false in `vite build`, so the branch and the
      // page's chunk (with its fonts) are dropped from production
      ...(import.meta.env.DEV
        ? [{ path: paths.specimen, lazy: lazyPage(() => import('@/pages/specimen/SpecimenPage')) }]
        : []),

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
