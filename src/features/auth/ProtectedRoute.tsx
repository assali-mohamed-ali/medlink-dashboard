import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '@/shared/ui'
import { useAuth } from './useAuth'
import { roleHome, type Role } from './roles'

type Props = {
  allowedRoles?: Role[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { status, user, sessionExpired } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <PageLoader />
  }

  if (!user) {
    return (
      <Navigate
        to="/connexion"
        replace
        state={{ from: location.pathname, sessionExpired }}
      />
    )
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles.some((role) => allowedRoles.includes(role))
    if (!hasRole) {
      // Redirige vers l’espace de son propre rôle
      return <Navigate to={roleHome(user.roles)} replace />
    }
  }

  return <Outlet />
}
