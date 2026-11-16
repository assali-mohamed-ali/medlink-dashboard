/** The roles staff can give from the back-office; a patient registers themselves (api-MedLink, MLink-69). */
export type StaffRole = 'PRACTITIONER' | 'ADMINISTRATIVE_STAFF'
export type AccountRole = StaffRole | 'PATIENT'

/**
 * One account as staff see it (AdminUserDto). `role` is null when the account has no MedLink role or several
 * (`ambiguousRole`): staff must repair it. `emailVerified` is false until a new staff member activates their account.
 */
export type Account = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: AccountRole | null
  roles: AccountRole[]
  ambiguousRole: boolean
  enabled: boolean
  emailVerified: boolean
}

/** GET /api/admin/users: one page and the total number of matches. */
export type AccountPage = { items: Account[]; total: number }

/** What a practitioner needs besides the account: their specialty and the clinics they work in. */
export type PractitionerProfile = { specialtyId: string; clinicIds: string[] }

/** POST /api/admin/users. No password: the person sets it from the activation mail (20.3). */
export type NewAccount = { email: string; firstName: string; lastName: string; role: StaffRole } & Partial<PractitionerProfile>

/** PUT /api/admin/users/{id}/role. */
export type RoleChange = { role: StaffRole } & Partial<PractitionerProfile>

/** The lists a practitioner's profile is chosen from. */
export type ProfileChoices = {
  clinics: { id: string; name: string; city: string }[]
  specialties: { id: string; name: string }[]
}
