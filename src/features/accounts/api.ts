import { apiFetch } from '@/shared/api/apiClient'
import type { Account, AccountPage, NewAccount, ProfileChoices, RoleChange } from './types'

// One function per endpoint (api-MedLink: MLink-69, 70, 88; ADMINISTRATIVE_STAFF only). Components never call fetch().

/** Rows per page of the accounts table (the API takes 1 to 100). */
export const PAGE_SIZE = 20

/** Endpoint 12: a page of accounts whose e-mail or name contains `search` (all when empty). */
export function fetchAccounts(search: string, page: number) {
  const query = new URLSearchParams({ search, page: String(page), size: String(PAGE_SIZE) })
  return apiFetch<AccountPage>(`/admin/users?${query}`)
}

/** Endpoint 13: 201 + the account (an activation mail is sent); 400 VALIDATION_FAILED per field; 409 EMAIL_TAKEN. */
export function createAccount(account: NewAccount) {
  return apiFetch<Account>('/admin/users', { method: 'POST', body: account })
}

/** Endpoint 15: 204; 409 PATIENT_ROLE_CHANGE_UNSUPPORTED or PRACTITIONER_HAS_SLOTS; 400 for a practitioner's profile. */
export function changeRole(id: string, change: RoleChange) {
  return apiFetch<void>(`/admin/users/${encodeURIComponent(id)}/role`, { method: 'PUT', body: change })
}

/** Endpoint 16: 204; disabling also ends the account's sessions; 409 CANNOT_DISABLE_SELF. */
export function setAccountEnabled(id: string, enabled: boolean) {
  return apiFetch<void>(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { enabled } })
}

/** Endpoint 11 (task 23.2): 204; the person's sessions end and they choose a new password at their next login. */
export function forcePasswordReset(id: string) {
  return apiFetch<void>(`/admin/users/${encodeURIComponent(id)}/force-password-reset`, { method: 'POST' })
}

type SlotFilters = ProfileChoices & { practitioners: unknown[] }

/**
 * The clinics and specialties a practitioner's profile is chosen from. The API has one list of both, the slot search's
 * (`GET /api/slots/filters`); staff need it to be allowed there (asked on MLink-69). Only the two lists are kept.
 */
export async function fetchProfileChoices(): Promise<ProfileChoices> {
  const { clinics, specialties } = await apiFetch<SlotFilters>('/slots/filters')
  return { clinics, specialties }
}
