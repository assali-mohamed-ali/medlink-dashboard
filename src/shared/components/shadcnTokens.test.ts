import { expect, test } from 'vitest'

// shadcn and Watermelon code reads some colours as raw var(--x). Our --secondary is a text colour (the existing pages
// use it so), not shadcn's light background: in this folder use var(--secondary-fixed) instead. See tailwind.css.
const SOURCES = import.meta.glob<string>('./**/*.tsx', { query: '?raw', import: 'default', eager: true })

test('no shadcn or Watermelon file reads our --secondary as a background', () => {
  const offenders = Object.keys(SOURCES).filter((file) => /var\(--secondary\)/.test(SOURCES[file]))
  expect(offenders, 'replace var(--secondary) with var(--secondary-fixed) in these files').toEqual([])
})

test('the scan sees the shadcn files', () => {
  expect(Object.keys(SOURCES)).toContain('./ui/button.tsx')
})
