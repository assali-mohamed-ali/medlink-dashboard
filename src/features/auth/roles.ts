import { paths } from '@/shared/config/paths'

export type Role = 'PATIENT' | 'PRACTITIONER' | 'ADMINISTRATIVE_STAFF'

/** Where each role lands after login: the root of its space. */
const ROLE_HOME: Record<Role, string> = {
  PATIENT: paths.patient.root,
  PRACTITIONER: paths.practitioner.root,
  ADMINISTRATIVE_STAFF: paths.staff.root,
}

/** The home of the person's role (one role per person: the first of the API's list), or the site's home. */
export function roleHome(roles: readonly Role[]): string {
  const first = roles[0]
  return first ? ROLE_HOME[first] : paths.home
}

/** Plain path segments only: no "..", "//", "\", "?", "#" or scheme can slip through. */
const PLAIN_PATH = /^(\/[A-Za-z0-9_-]+)+\/?$/

/**
 * Where to go after a login: the page the guard saved before sending the person to /connexion (MLink-85), when
 * it is a plain path inside their own space; anything else (another space, another site, nothing) is the role home.
 */
export function landingAfterLogin(roles: readonly Role[], from: unknown): string {
  const home = roleHome(roles)
  const inOwnSpace =
    home !== paths.home &&
    typeof from === 'string' &&
    PLAIN_PATH.test(from) &&
    (from === home || from.startsWith(`${home}/`))
  return inOwnSpace ? from : home
}
