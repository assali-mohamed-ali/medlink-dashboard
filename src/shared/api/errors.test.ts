import { expect, test } from 'vitest'
import { ApiError } from './apiClient'
import { fieldErrors, messageFor } from './errors'

test('uses our own text for a code the screens word themselves', () => {
  const error = new ApiError(401, 'INVALID_CODE', 'Code invalide.')
  expect(messageFor(error)).toBe('Code incorrect. Vérifiez le code affiché dans votre application.')
})

test("falls back to the API's French message", () => {
  const error = new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Confirmez votre adresse e-mail.')
  expect(messageFor(error)).toBe('Confirmez votre adresse e-mail.')
})

test('gives a generic message for anything that is not an ApiError', () => {
  expect(messageFor(new Error('boom'))).toBe('Une erreur est survenue. Veuillez réessayer.')
  expect(messageFor('boom')).toBe('Une erreur est survenue. Veuillez réessayer.')
})

test('keeps only the expected fields that carry a message', () => {
  const details = { email: 'E-mail invalide.', phone: '', unknown: 'x', address: 42 }
  expect(fieldErrors(details, ['email', 'phone', 'address'] as const)).toEqual({
    email: 'E-mail invalide.',
  })
})

test('returns no field error when there are no details', () => {
  expect(fieldErrors(undefined, ['email'] as const)).toEqual({})
  expect(fieldErrors('oops', ['email'] as const)).toEqual({})
})
