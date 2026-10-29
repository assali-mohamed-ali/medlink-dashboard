// Public API of the auth feature: other folders import from '@/features/auth', never from its files.
// Pages are the exception: the router imports them directly so that each one can be lazy-loaded.
export { default as AuthProvider } from './AuthProvider'
export { default as ProtectedRoute } from './ProtectedRoute'
export { useAuth } from './useAuth'
export { roleHome } from './roles'
export type { Role } from './roles'
export type { AuthUser, LoginResponse } from './types'
