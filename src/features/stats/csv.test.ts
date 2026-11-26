import { describe, expect, it } from 'vitest'
import { parseCsv, parseStats } from './csv'

describe('parseCsv', () => {
  it('splits lines and fields, with Windows or Unix line ends', () => {
    expect(parseCsv('a,b,c\r\n1,2,3\n4,5,6\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  it('reads quoted fields: comma, doubled quote and line break inside', () => {
    expect(parseCsv('x,"Cardio, adulte","dit ""oui""","a\nb"\n')).toEqual([['x', 'Cardio, adulte', 'dit "oui"', 'a\nb']])
  })

  it('ignores a byte order mark and empty lines', () => {
    expect(parseCsv('﻿a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('parseStats', () => {
  it('turns the lines under the header into rows with a numeric count', () => {
    const csv = 'indicator,group,count\nAPPOINTMENTS_PER_STATUS,CONFIRMED,12\nAPPOINTMENTS_PER_SPECIALTY,"Cardiologie, adulte",7\n'
    expect(parseStats(csv)).toEqual([
      { indicator: 'APPOINTMENTS_PER_STATUS', group: 'CONFIRMED', count: 12 },
      { indicator: 'APPOINTMENTS_PER_SPECIALTY', group: 'Cardiologie, adulte', count: 7 },
    ])
  })

  it('gives no row for a file with only its header', () => {
    expect(parseStats('indicator,group,count\n')).toEqual([])
  })
})
