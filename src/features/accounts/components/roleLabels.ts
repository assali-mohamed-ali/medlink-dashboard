import type { AccountRole, StaffRole } from '../types'

/** The roles in French, as the rest of the app names them. */
export const ROLE_LABELS: Record<AccountRole, string> = {
  PRACTITIONER: 'Praticien',
  ADMINISTRATIVE_STAFF: 'Personnel administratif',
  PATIENT: 'Patient',
}

/** The choices of the role radios: the roles staff can give. */
export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'PRACTITIONER', label: ROLE_LABELS.PRACTITIONER },
  { value: 'ADMINISTRATIVE_STAFF', label: ROLE_LABELS.ADMINISTRATIVE_STAFF },
]
