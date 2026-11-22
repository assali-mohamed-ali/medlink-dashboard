import type { Role } from './roles'

/** The user object of the API (plan.md §4, endpoints 5, 6 and 9). `id` is the Keycloak id. */
export type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: Role[]
}

/** POST /api/auth/login: exactly one of these answers. */
export type LoginResponse = {
  user?: AuthUser
  mfaRequired?: boolean
  mfaSetupRequired?: boolean
  passwordChangeRequired?: boolean
}

export type RegisterPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  address: string
}

export type RegisterResponse = {
  message?: string
}
