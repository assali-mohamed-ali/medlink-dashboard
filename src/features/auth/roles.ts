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
