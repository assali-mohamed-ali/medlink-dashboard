import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { checkTokens, contrastRatio, readTokens } from './contrast.mjs'

// UI refresh B2 (docs/ui-refresh/PLAN.md §4.2): every text pair of tokens.css reaches 4.5:1 (WCAG 1.4.3) and every
// field or control edge 3:1 (WCAG 1.4.11). `npm run check:contrast` runs the same check in CI.

test('the contrast ratio follows WCAG 2.2', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  expect(contrastRatio('#ffffff', '#0e5245')).toBeCloseTo(contrastRatio('#0e5245', '#ffffff'), 6)
})

test('a token written as var(--other) is read through its alias', () => {
  const tokens = readTokens(':root {\n  --a: #FFFFFF;\n  --b: var(--a);\n  --c: var(--b); /* note */\n}')
  expect(tokens.get('--c')).toBe('#ffffff')
})

test('the check catches today\'s greys: field edges 1.70:1 and muted text 4.49:1 on a card', () => {
  const today = `:root {
    --on-surface: #111c2d; --on-surface-variant: #404945; --primary: #0e5245; --primary-hover: #235348;
    --on-primary: #ffffff; --primary-fixed: #b1efdd; --secondary-fixed: #dde5da; --error: #ba1a1a;
    --error-container: #ffdad6; --on-error-container: #93000a;
    --bg: #f9f9ff; --surface-raised: #ffffff; --surface-sunken: #f0f3ff;
    --border-strong: #bfc9c4; --text-muted: #707975;
  }`
  const failing = checkTokens(today).filter((check) => !check.pass)
  expect(failing).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fg: '--border-strong', bg: '--surface-raised', ratio: expect.closeTo(1.7, 2) }),
      expect.objectContaining({ fg: '--text-muted', bg: '--surface-raised', ratio: expect.closeTo(4.49, 2) }),
    ]),
  )
})

test('a pair whose token is missing fails instead of being skipped', () => {
  const missing = checkTokens(':root { --on-surface: #111c2d; }').filter((check) => !check.pass)
  expect(missing.length).toBeGreaterThan(0)
  expect(missing[0].ratio).toBeNaN()
})

test('tokens.css passes every pair', () => {
  const failing = checkTokens(readFileSync('src/shared/styles/tokens.css', 'utf8')).filter((check) => !check.pass)
  expect(failing).toEqual([])
})
