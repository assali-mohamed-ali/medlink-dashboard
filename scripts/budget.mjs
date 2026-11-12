#!/usr/bin/env node
/*
 * Bundle budget (docs/ui-refresh/PLAN.md §5, D3): the JavaScript a first visit downloads (the module script index.html
 * loads and the chunks it preloads with it) stays ≤ 110 kB gzip, and the font files ≤ 90 kB in all. No dependency.
 * Run after `npm run build`: `npm run check:budget`; CI runs it after the build. Pages and the space shell are lazy
 * chunks, outside this budget. The entry alone is not measured: Rollup moves shared libraries (react-router) between
 * the entry and a preloaded chunk as the import graph changes, with the same download.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

export const BUDGET = { firstVisitGzip: 110_000, fonts: 90_000 }

/** The paths (inside dist/) of the scripts a first visit downloads: the module script, then its modulepreload links. */
export function firstVisitScripts(html) {
  const entry = html.match(/<script[^>]*type="module"[^>]*src="\/?([^"]+)"/)?.[1]
  if (!entry) throw new Error('No module script in index.html')
  const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="\/?([^"]+)"/g)].map((match) => match[1])
  return [entry, ...preloads]
}

/** One check per budget line: { name, size, max, pass }. Sizes in bytes (each script gzipped on its own). */
export function checkBudget({ scriptsGzip, fonts }) {
  const sum = (sizes) => sizes.reduce((total, size) => total + size, 0)
  const scripts = sum(scriptsGzip)
  const fontTotal = sum(fonts)
  return [
    {
      name: 'first-visit JavaScript (gzip)',
      size: scripts,
      max: BUDGET.firstVisitGzip,
      pass: scripts <= BUDGET.firstVisitGzip,
    },
    { name: 'fonts', size: fontTotal, max: BUDGET.fonts, pass: fontTotal <= BUDGET.fonts },
  ]
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = 'dist'
  const scriptsGzip = firstVisitScripts(readFileSync(join(dist, 'index.html'), 'utf8')).map(
    (file) => gzipSync(readFileSync(join(dist, file))).length,
  )
  const assets = join(dist, 'assets')
  const fonts = readdirSync(assets)
    .filter((file) => /\.(woff2?|ttf|otf)$/.test(file))
    .map((file) => readFileSync(join(assets, file)).length)
  const checks = checkBudget({ scriptsGzip, fonts })
  for (const { name, size, max, pass } of checks) {
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}: ${(size / 1000).toFixed(1)} kB (max ${max / 1000} kB)`)
  }
  process.exitCode = checks.every((check) => check.pass) ? 0 : 1
}
