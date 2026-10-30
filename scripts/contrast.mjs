#!/usr/bin/env node
/*
 * Contrast check of MedLink's colour tokens (docs/ui-refresh/PLAN.md §4.2): every text pair reaches 4.5:1 (WCAG 1.4.3)
 * and every field or control edge 3:1 (WCAG 1.4.11). No dependency: it reads src/shared/styles/tokens.css, follows
 * var(--x) aliases and computes the WCAG 2.2 ratio. `npm run check:contrast`; CI runs it on every push.
 * A new text or edge colour joins PAIRS below.
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const SURFACES = ['--bg', '--surface-raised', '--surface-sunken']

/** [foreground, background, minimum, what it is] */
export const PAIRS = [
  ...SURFACES.flatMap((bg) => [
    ['--on-surface', bg, 4.5, 'text'],
    ['--on-surface-variant', bg, 4.5, 'secondary text'],
    ['--text-muted', bg, 4.5, 'hints and placeholders'],
    ['--primary', bg, 4.5, 'links, eyebrows, ghost buttons'],
    ['--border-strong', bg, 3, 'field and control edges'],
  ]),
  ['--error', '--surface-raised', 4.5, 'field errors'],
  ['--on-primary', '--primary', 4.5, 'primary button'],
  ['--on-primary', '--primary-hover', 4.5, 'primary button, hovered'],
  ['--primary', '--secondary-fixed', 4.5, 'active menu entry, confirmed badge'],
  ['--primary', '--primary-fixed', 4.5, 'selected chip (--accent-soft)'],
  ['--on-error-container', '--error-container', 4.5, 'error alert'],
  ['--on-warning-container', '--warning-container', 4.5, 'warning alert'],
  ['--success', '--success-container', 4.5, 'success alert'],
  ['--on-surface', '--info-container', 4.5, 'info alert'],
  ['--on-primary', '--error', 4.5, 'danger button'],
  ['--on-primary', '--on-error-container', 4.5, 'danger button, hovered'],
]

/** The custom properties of a stylesheet, aliases resolved: Map('--x' → '#rrggbb' or the raw value). */
export function readTokens(css) {
  const raw = new Map()
  for (const [, name, value] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    raw.set(name, value.trim())
  }
  const resolve = (name, seen = new Set()) => {
    const value = raw.get(name)
    const alias = value?.match(/^var\((--[\w-]+)\)$/)
    if (!alias || seen.has(name)) return value?.toLowerCase()
    return resolve(alias[1], seen.add(name))
  }
  return new Map([...raw.keys()].map((name) => [name, resolve(name)]))
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.2 contrast ratio of two #rrggbb colours (1 to 21); NaN when one is not a #rrggbb colour. */
export function contrastRatio(a, b) {
  if (![a, b].every((c) => /^#[0-9a-f]{6}$/i.test(c ?? ''))) return NaN
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** Every pair of PAIRS, measured on a stylesheet. A missing or non-hex token fails (ratio NaN), never skips. */
export function checkTokens(css) {
  const tokens = readTokens(css)
  return PAIRS.map(([fg, bg, min, use]) => {
    const ratio = contrastRatio(tokens.get(fg), tokens.get(bg))
    return { fg, bg, min, use, ratio, pass: ratio >= min }
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const checks = checkTokens(readFileSync('src/shared/styles/tokens.css', 'utf8'))
  for (const { fg, bg, min, use, ratio, pass } of checks) {
    const shown = Number.isNaN(ratio) ? 'missing' : `${ratio.toFixed(2)}:1`
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${fg} on ${bg}  ${shown} (min ${min}:1, ${use})`)
  }
  const failed = checks.filter((check) => !check.pass).length
  console.log(failed ? `\n${failed} pair(s) below the WCAG minimum.` : `\nAll ${checks.length} pairs pass.`)
  process.exitCode = failed ? 1 : 0
}
