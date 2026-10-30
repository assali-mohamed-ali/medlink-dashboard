import { expect, test } from 'vitest'

// UI refresh B1 (docs/ui-refresh/PLAN.md §4.1, decision D1 = option B): Geist for the interface, Instrument Serif for a
// few display titles, both self-hosted (CSP 'self'), Latin subset only, and one type scale in tokens.css.
const CSS = import.meta.glob<string>('/src/**/*.css', { query: '?raw', import: 'default', eager: true })
const tokens = CSS['/src/shared/styles/tokens.css']
const fonts = CSS['/src/shared/styles/fonts.css'] ?? ''
const global = CSS['/src/shared/styles/global.css']

function token(name: string) {
  return tokens.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()
}

test('the interface face is Geist and the display face Instrument Serif, with system fallbacks', () => {
  expect(token('--font-sans')).toMatch(/^'Geist Variable', system-ui,/)
  expect(token('--font-display')).toMatch(/^'Instrument Serif', Georgia,/)
  // The old name stays as an alias until every stylesheet reads --font-sans
  expect(token('--font')).toBe('var(--font-sans)')
})

test('the type scale of PLAN.md §4.1 is in the tokens', () => {
  expect([
    token('--text-xs'),
    token('--text-sm'),
    token('--text-md'),
    token('--text-lg'),
    token('--text-xl'),
    token('--text-2xl'),
    token('--text-3xl'),
    token('--display-sm'),
    token('--display-lg'),
  ]).toEqual(['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '1.875rem', '2.25rem', 'clamp(2.5rem, 5vw, 3.5rem)'])
  expect([token('--leading-xs'), token('--leading-sm'), token('--leading-md'), token('--leading-3xl')]).toEqual([
    '1rem',
    '1.25rem',
    '1.5rem',
    '2.25rem',
  ])
})

test('the fonts are self-hosted, Latin only, two files, shown at once with a fallback (font-display: swap)', () => {
  expect(global).toContain("@import './fonts.css';")
  const files = [...fonts.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1])
  expect(files).toEqual([
    '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
    '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  ])
  expect(fonts.match(/font-display:\s*swap/g)).toHaveLength(2)
  expect(fonts).not.toMatch(/https?:/)
})

test('no shared or feature stylesheet names a face that is not loaded (audit A1)', () => {
  const offenders = Object.keys(CSS).filter(
    (file) => /^\/src\/(shared|features|spaces)\//.test(file) && /Plus Jakarta/.test(CSS[file]),
  )
  expect(offenders).toEqual([])
})
