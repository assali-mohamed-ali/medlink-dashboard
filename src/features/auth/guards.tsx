import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { PageLoader } from '@/shared/ui'
import { roleHome, type Role } from './roles'
import { useAuth } from './useAuth'

type RequireAuthProps = {
  /** Only this role may enter; anyone else logged in goes to "Accès refusé". Omit: any logged-in person. */
  role?: Role
  /** What to show when allowed; default: the child routes (<Outlet />). */
  children?: ReactNode
}

/**
 * Guards a route branch (a whole space): waits for the session, sends a visitor to /connexion (remembering the
 * page, and whether the API ended the session), and a person of another role to /acces-refuse.
 * This only spares people screens they can't use: the API checks the role on every call.
 */
export function RequireAuth({ role, children }: RequireAuthProps) {
  const { status, role: currentRole, sessionExpired } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (status === 'anonymous') {
    return (
      <Navigate to={paths.login} replace state={{ from: location.pathname, sessionExpired }} />
    )
  }
  if (role && currentRole !== role) return <Navigate to={paths.accessDenied} replace />
  return children ?? <Outlet />
}

/** For pages only a visitor needs (login, signup): a logged-in person goes straight to their space. */
export function GuestOnly({ children }: { children?: ReactNode }) {
  const { status, user } = useAuth()
  if (status === 'loading') return <PageLoader />
  if (user) return <Navigate to={roleHome(user.roles)} replace />
  return children ?? <Outlet />
}
