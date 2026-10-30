/// <reference types="node" />
// Node's types for this test only (it reads files); app code stays on browser types (tsconfig.app.json)
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// What jsdom cannot see: touch targets of at least 44 × 44 px (WCAG 2.5.8, PLAN.md §4.3) and a visible disabled state.
// Read from disk: Vitest replaces CSS imports with an empty string.
const css = (name: string) => readFileSync(`src/shared/ui/${name}.module.css`, 'utf8')
const px = (block: string, property: string) =>
  Number(block.match(new RegExp(`(?:^|[\\s;])${property}:\\s*(\\d+)px`))?.[1] ?? 0)
/** The declarations of the first rule whose selector is exactly `selector` (e.g. ".toggle"). */
const rule = (source: string, selector: string) =>
  source.match(new RegExp(`(?:^|\\n)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''

test('every button size is at least 44 px high', () => {
  const button = css('Button')
  for (const selector of ['.button', '.sm', '.md', '.lg']) {
    const height = px(rule(button, selector), 'min-height')
    expect(height, `${selector} min-height`).toBeGreaterThanOrEqual(44)
  }
})

test('the password toggle is a 44 × 44 px target', () => {
  const toggle = rule(css('PasswordField'), '.toggle')
  expect(px(toggle, 'width')).toBeGreaterThanOrEqual(44)
  expect(px(toggle, 'height')).toBeGreaterThanOrEqual(44)
})

test('a disabled field looks disabled', () => {
  expect(css('TextField')).toMatch(/\.input:disabled\s*\{[^}]*cursor:\s*not-allowed/)
})
