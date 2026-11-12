import { expect, test } from 'vitest'
import { NEUTRALS, contrastChecks, contrastRatio } from './neutrals'

test('the contrast ratio follows WCAG 2.2', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 2)
  // Same pair either way round
  expect(contrastRatio('#0e5245', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#0e5245'), 6)
  // The audit's numbers (PLAN.md §3, A3 and A4)
  expect(contrastRatio('#bfc9c4', '#ffffff')).toBeCloseTo(1.7, 2)
  expect(contrastRatio('#707975', '#ffffff')).toBeCloseTo(4.49, 2)
})

test('every proposed grey passes: muted text 4.5:1 and field edges 3:1 on each surface', () => {
  const failing = contrastChecks(NEUTRALS.proposed).filter((check) => check.ratio < check.min)
  expect(failing).toEqual([])
})

test('today\'s greys fail on field edges and muted text (why D2 exists)', () => {
  const failing = contrastChecks(NEUTRALS.current).filter((check) => check.ratio < check.min)
  expect(failing.map((check) => check.label)).toEqual(
    expect.arrayContaining(['Bord de champ sur la carte', 'Texte discret sur la carte']),
  )
})
