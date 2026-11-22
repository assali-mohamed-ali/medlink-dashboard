import type { ClinicRef } from './types'

/** Three tones, one per clinic (tokens --clinic-1…3). A clinic is always named too: colour is never alone. */
export const TONES = 3

/** The clinics in a stable order (by name), so a clinic keeps its colour from one week to the next. */
export function sortedClinics(clinics: readonly ClinicRef[]): ClinicRef[] {
  return [...clinics].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** "Clinique MedLink Sousse" → "Sousse": where the space is short (a slot, a day). The full name stays for screen readers. */
export function shortName(name: string): string {
  return name.replace(/^Clinique\s+(MedLink\s+)?/i, '').trim() || name
}

/** The tone (1 to 3) of each clinic id, from its place in the sorted list. */
export function toneOf(clinics: readonly ClinicRef[]): Map<string, number> {
  return new Map(sortedClinics(clinics).map((clinic, index) => [clinic.id, (index % TONES) + 1]))
}
