import type { StatsRow } from './types'

/** Splits CSV text into lines of fields: handles quoted fields (a comma, a quote or a line break inside). */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '')
  const lines: string[][] = []
  let line: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      line.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      line.push(field)
      field = ''
      lines.push(line)
      line = []
    } else {
      field += char
    }
  }
  if (field !== '' || line.length > 0) {
    line.push(field)
    lines.push(line)
  }
  return lines.filter((fields) => fields.some((value) => value !== ''))
}

/** The rows of the statistics CSV (`indicator,group,count`), without its header line. */
export function parseStats(csv: string): StatsRow[] {
  return parseCsv(csv)
    .slice(1)
    .filter((fields) => fields.length >= 3)
    .map(([indicator = '', group = '', count = '0']) => ({
      indicator,
      group,
      count: Number(count),
    }))
}
