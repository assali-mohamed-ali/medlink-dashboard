import { expect, test } from 'vitest'
import { ACTION_LABELS, actionLabel, formatWhen, outcomeView } from './format'

test('every action of the API has a French label', () => {
  const known = [
    'ACCESS_DENIED',
    'ACCOUNT_CREATED',
    'ACCOUNT_DISABLED',
    'ACCOUNT_ENABLED',
    'ACCOUNT_UPDATED',
    'DATA_READ',
    'LOGIN',
    'PASSWORD_CHANGE_REQUIRED',
    'RECORD_VIEWED',
    'ROLE_CHANGED',
    'SLOT_CLOSED',
    'SLOT_OPENED',
  ]
  expect(Object.keys(ACTION_LABELS).sort()).toEqual(known)
})

test('the account actions are said in French', () => {
  expect(actionLabel('ACCOUNT_CREATED')).toBe('Compte créé')
  expect(actionLabel('ROLE_CHANGED')).toBe('Rôle modifié')
  expect(actionLabel('ACCOUNT_ENABLED')).toBe('Compte activé')
  expect(actionLabel('ACCOUNT_DISABLED')).toBe('Compte désactivé')
})

test('an action the screen does not know yet is shown as the API sends it', () => {
  expect(actionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
})

test('the three outcomes of the API have a label and a tone', () => {
  expect(outcomeView('SUCCESS')).toEqual({ label: 'Réussi', tone: 'success' })
  expect(outcomeView('FAILURE')).toEqual({ label: 'Échec', tone: 'danger' })
  expect(outcomeView('DENIED')).toEqual({ label: 'Refusé', tone: 'danger' })
})

test('an unknown outcome is shown as is, in neutral', () => {
  expect(outcomeView('PENDING')).toEqual({ label: 'PENDING', tone: 'neutral' })
})

test('an unreadable date is shown as the API sent it', () => {
  expect(formatWhen('pas une date')).toBe('pas une date')
})
