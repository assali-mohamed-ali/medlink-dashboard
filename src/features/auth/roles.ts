export type Role = 'PATIENT' | 'PRACTITIONER' | 'ADMINISTRATIVE_STAFF'

const ROLE_HOME: Record<Role, string> = {
  PATIENT: '/patient',
  PRACTITIONER: '/praticien',
  ADMINISTRATIVE_STAFF: '/admin',
}

export function roleHome(roles: Role[]): string {
  const first = roles[0]
  return first ? ROLE_HOME[first] : '/'
}
