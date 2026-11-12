import type { CSSProperties } from 'react'

/**
 * The two sets of greys decision D2 chooses between (docs/ui-refresh/PLAN.md §4.2). The specimen paints with these
 * values and shows their contrast checks, so what the team sees and what is measured are the same numbers.
 * B2 moves the chosen set into tokens.css; until then they live here only.
 */
export type Neutrals = {
  bg: string
  raised: string
  sunken: string
  /** Dividers: decorative, no contrast minimum */
  border: string
  /** Field and control edges: 3:1 (WCAG 1.4.11) */
  borderStrong: string
  /** Hints and placeholders: 4.5:1 (WCAG 1.4.3) */
  textMuted: string
}

export const NEUTRALS = {
  // Today: the M3 lavender tint; dividers and field edges share --outline-variant
  current: {
    bg: '#f9f9ff',
    raised: '#ffffff',
    sunken: '#f0f3ff',
    border: '#bfc9c4',
    borderStrong: '#bfc9c4',
    textMuted: '#707975',
  },
  // The proposal: the brand's own green tint, one temperature for page, cards and fields
  proposed: {
    bg: '#f6f8f6',
    raised: '#ffffff',
    sunken: '#f3f6f4',
    border: '#dfe5e1',
    borderStrong: '#808a85',
    textMuted: '#5f6863',
  },
} satisfies Record<string, Neutrals>

export type NeutralSet = keyof typeof NEUTRALS

/** Today's token names, set to a grey set: the existing components (TextField, Button…) repaint with no change. */
export function neutralVars(n: Neutrals): CSSProperties {
  return {
    '--surface': n.bg,
    '--surface-lowest': n.raised,
    '--surface-low': n.sunken,
    '--outline-variant': n.borderStrong,
    '--outline': n.textMuted,
    '--specimen-border': n.border,
  } as CSSProperties
}

function channel(value: number) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.2 contrast ratio of two #rrggbb colours, from 1 to 21. */
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

export type ContrastCheck = { label: string; fg: string; bg: string; ratio: number; min: number }

/** Muted text and field edges on each surface they meet. */
export function contrastChecks(n: Neutrals): ContrastCheck[] {
  const surfaces = [
    ['la page', n.bg],
    ['la carte', n.raised],
    ['le fond du champ', n.sunken],
  ] as const
  return surfaces.flatMap(([where, bg]) => [
    { label: `Texte discret sur ${where}`, fg: n.textMuted, bg, ratio: contrastRatio(n.textMuted, bg), min: 4.5 },
    { label: `Bord de champ sur ${where}`, fg: n.borderStrong, bg, ratio: contrastRatio(n.borderStrong, bg), min: 3 },
  ])
}
