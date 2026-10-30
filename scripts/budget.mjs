#!/usr/bin/env node
/*
 * Bundle budget (docs/ui-refresh/PLAN.md §5, D3): the JavaScript a first visit downloads (the script index.html
 * loads) stays ≤ 75 kB gzip, and the font files ≤ 90 kB in all. No dependency. Run after `npm run build`:
 * `npm run check:budget`; CI runs it after the build. Pages and the space shell are lazy chunks, outside this budget.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

export const BUDGET = { entryGzip: 75_000, fonts: 90_000 }

/** The path (inside dist/) of the module script index.html loads. */
export function entryScript(html) {
  const src = html.match(/<script[^>]*type="module"[^>]*src="\/?([^"]+)"/)?.[1]
  if (!src) throw new Error('No module script in index.html')
  return src
}

/** One check per budget line: { name, size, max, pass }. Sizes in bytes. */
export function checkBudget({ entryGzip, fonts }) {
  const fontTotal = fonts.reduce((sum, size) => sum + size, 0)
  return [
    { name: 'entry JavaScript (gzip)', size: entryGzip, max: BUDGET.entryGzip, pass: entryGzip <= BUDGET.entryGzip },
    { name: 'fonts', size: fontTotal, max: BUDGET.fonts, pass: fontTotal <= BUDGET.fonts },
  ]
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = 'dist'
  const entry = readFileSync(join(dist, entryScript(readFileSync(join(dist, 'index.html'), 'utf8'))))
  const assets = join(dist, 'assets')
  const fonts = readdirSync(assets)
    .filter((file) => /\.(woff2?|ttf|otf)$/.test(file))
    .map((file) => readFileSync(join(assets, file)).length)
  const checks = checkBudget({ entryGzip: gzipSync(entry).length, fonts })
  for (const { name, size, max, pass } of checks) {
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}: ${(size / 1000).toFixed(1)} kB (max ${max / 1000} kB)`)
  }
  process.exitCode = checks.every((check) => check.pass) ? 0 : 1
}
