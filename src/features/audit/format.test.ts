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
    'DOCUMENT_LIST',
    'DOCUMENT_READ',
    'DOCUMENT_UPLOAD',
    'LOGIN',
    'PASSWORD_CHANGE_REQUIRED',
    'RECORD_VIEWED',
    'REPORT_CREATED',
    'REPORT_VIEWED',
    'ROLE_CHANGED',
    'SLOT_CLOSED',
    'SLOT_OPENED',
    'STATS_EXPORTED',
  ]
  expect(Object.keys(ACTION_LABELS).sort()).toEqual(known)
})

test('the account actions are said in French', () => {
  expect(actionLabel('ACCOUNT_CREATED')).toBe('Compte créé')
  expect(actionLabel('ROLE_CHANGED')).toBe('Rôle modifié')
  expect(actionLabel('ACCOUNT_ENABLED')).toBe('Compte activé')
  expect(actionLabel('ACCOUNT_DISABLED')).toBe('Compte désactivé')
})

test('the consultation report actions are said in French', () => {
  expect(actionLabel('REPORT_CREATED')).toBe('Compte rendu de consultation créé')
  expect(actionLabel('REPORT_VIEWED')).toBe('Comptes rendus de consultation consultés')
})

test('the statistics export is said in French', () => {
  expect(actionLabel('STATS_EXPORTED')).toBe('Statistiques anonymisées exportées')
})

test('an action the screen does not know yet is shown as the API sends it', () => {
  expect(actionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
})

test('the outcomes of the API have a label and a tone', () => {
  expect(outcomeView('SUCCESS')).toEqual({ label: 'Réussi', tone: 'success' })
  expect(outcomeView('FAILURE')).toEqual({ label: 'Échec', tone: 'danger' })
  expect(outcomeView('DENIED')).toEqual({ label: 'Refusé', tone: 'danger' })
  expect(outcomeView('ATTEMPTED')).toEqual({ label: 'Tentative', tone: 'neutral' })
  expect(outcomeView('NOT_NEEDED')).toEqual({ label: 'Non nécessaire', tone: 'neutral' })
})

test('an unknown outcome is shown as is, in neutral', () => {
  expect(outcomeView('PENDING')).toEqual({ label: 'PENDING', tone: 'neutral' })
})

test('an unreadable date is shown as the API sent it', () => {
  expect(formatWhen('pas une date')).toBe('pas une date')
})
