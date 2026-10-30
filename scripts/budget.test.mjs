import { expect, test } from 'vitest'
import { BUDGET, checkBudget, entryScript } from './budget.mjs'

// UI refresh D3 (docs/ui-refresh/PLAN.md §5): the JavaScript a first visit downloads stays ≤ 75 kB gzip and the fonts
// ≤ 90 kB. `npm run check:budget` runs the same check on dist/ after `npm run build` (CI does).

test('the entry script is the one index.html loads', () => {
  const html = '<script type="module" crossorigin src="/assets/index-Ab12.js"></script>'
  expect(entryScript(html)).toBe('assets/index-Ab12.js')
})

test('within budget, every check passes', () => {
  const checks = checkBudget({ entryGzip: 70_000, fonts: [29_400, 21_032] })
  expect(checks.every((check) => check.pass)).toBe(true)
})

test('an entry script over 75 kB gzip fails, and so do fonts over 90 kB', () => {
  const checks = checkBudget({ entryGzip: 88_210, fonts: [60_000, 40_000] })
  expect(checks.filter((check) => !check.pass).map((check) => check.name)).toEqual([
    'entry JavaScript (gzip)',
    'fonts',
  ])
  expect(BUDGET).toEqual({ entryGzip: 75_000, fonts: 90_000 })
})
