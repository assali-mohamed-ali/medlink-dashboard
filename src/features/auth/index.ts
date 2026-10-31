// Public API of the auth feature: other folders import from '@/features/auth', never from its files.
// Pages are the exception: the routes import them lazily so that each one is its own chunk.
export { default as AuthProvider } from './AuthProvider'
export { GuestOnly, RequireAuth } from './guards'
export { authRoutes } from './routes'
export { useAuth } from './useAuth'
export { roleHome } from './roles'
export type { Role } from './roles'
export type { AuthUser, LoginResponse } from './types'
