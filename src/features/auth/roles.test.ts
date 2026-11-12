import { expect, test } from 'vitest'
import { landingAfterLogin } from './roles'

// After a login, the page the guard saved (MLink-85) is used only when it is a plain path inside the person's own
// space; anything else (another space, another site, odd paths, nothing saved) falls back to the role's home.

test('goes back to the saved page inside the own space', () => {
  expect(landingAfterLogin(['PATIENT'], '/patient/rendez-vous')).toBe('/patient/rendez-vous')
  expect(landingAfterLogin(['PRACTITIONER'], '/praticien')).toBe('/praticien')
  expect(landingAfterLogin(['ADMINISTRATIVE_STAFF'], '/admin/comptes')).toBe('/admin/comptes')
})

test('without a saved page, goes to the role home', () => {
  expect(landingAfterLogin(['PATIENT'], undefined)).toBe('/patient')
  expect(landingAfterLogin(['PATIENT'], 42)).toBe('/patient')
})

test('a page of another space goes to the role home', () => {
  expect(landingAfterLogin(['PATIENT'], '/admin')).toBe('/patient')
  expect(landingAfterLogin(['PATIENT'], '/patientx')).toBe('/patient')
  expect(landingAfterLogin(['PRACTITIONER'], '/patient/dossier')).toBe('/praticien')
})

test('anything that is not a plain local path goes to the role home', () => {
  for (const from of [
    '//evil.example.com',
    'https://evil.example.com/patient',
    '/patient/../admin',
    '/patient//evil.example.com',
    '/patient\\evil',
    '/patient?next=/admin',
    'patient',
  ]) {
    expect(landingAfterLogin(['PATIENT'], from), from).toBe('/patient')
  }
})

test('no role: the site home, whatever was saved', () => {
  expect(landingAfterLogin([], '/patient')).toBe('/')
})
