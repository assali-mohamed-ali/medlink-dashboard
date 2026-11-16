import { expect, test } from 'vitest'
import { BUDGET, checkBudget, firstVisitScripts } from './budget.mjs'

// UI refresh D3 (docs/ui-refresh/PLAN.md §5): the JavaScript a first visit downloads (the entry script and the chunks
// index.html preloads with it) stays ≤ 110 kB gzip, and the fonts ≤ 90 kB. `npm run check:budget` runs the same check
// on dist/ after `npm run build` (CI does).

const HTML = [
  '<script type="module" crossorigin src="/assets/index-Ab12.js"></script>',
  '<link rel="modulepreload" crossorigin href="/assets/paths-Cd34.js">',
  '<link rel="modulepreload" crossorigin href="/assets/circle-check-Ef56.js">',
].join('\n')

test('a first visit downloads the entry script and every chunk index.html preloads with it', () => {
  expect(firstVisitScripts(HTML)).toEqual(['assets/index-Ab12.js', 'assets/paths-Cd34.js', 'assets/circle-check-Ef56.js'])
})

test('no preloaded chunk: the entry script alone', () => {
  expect(firstVisitScripts('<script type="module" crossorigin src="/assets/index-Ab12.js"></script>')).toEqual([
    'assets/index-Ab12.js',
  ])
})

test('within budget, every check passes', () => {
  const checks = checkBudget({ scriptsGzip: [71_100, 30_900, 4_800], fonts: [29_400, 21_032] })
  expect(checks.every((check) => check.pass)).toBe(true)
})

test('first-visit JavaScript over 110 kB gzip fails, even when the entry alone is small; so do fonts over 90 kB', () => {
  // Rollup can move a library (react-router) between the entry and a preloaded chunk: the sum is what counts
  const checks = checkBudget({ scriptsGzip: [70_000, 41_000], fonts: [60_000, 40_000] })
  expect(checks.filter((check) => !check.pass).map((check) => check.name)).toEqual([
    'first-visit JavaScript (gzip)',
    'fonts',
  ])
  expect(BUDGET).toEqual({ firstVisitGzip: 110_000, fonts: 90_000 })
})
