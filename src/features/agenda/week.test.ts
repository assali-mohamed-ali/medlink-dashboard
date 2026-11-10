import { expect, test } from 'vitest'
import { mondayOf, tunisDay, tunisInstant, weekPeriod, weekTitle } from './week'

// MLink-26 (26.7, 26.8): the agenda's dates are Tunis dates, whatever the browser's time zone.

test('the day of an instant is its day in Tunis (UTC+1)', () => {
  expect(tunisDay('2026-11-11T22:59:00Z')).toBe('2026-11-11')
  expect(tunisDay('2026-11-11T23:00:00Z')).toBe('2026-11-12') // midnight in Tunis
})

test('a week starts on Monday', () => {
  expect(mondayOf('2026-11-11')).toBe('2026-11-09') // a Wednesday
  expect(mondayOf('2026-11-09')).toBe('2026-11-09')
  expect(mondayOf('2026-11-15')).toBe('2026-11-09') // the Sunday after
})

test('a time typed in the form is read in Tunis and sent as UTC', () => {
  expect(tunisInstant('2026-11-12', '09:30')).toBe('2026-11-12T08:30:00.000Z')
  expect(tunisInstant('2026-11-12', '00:15')).toBe('2026-11-11T23:15:00.000Z')
})

test('the API is asked for Monday 00:00 to Sunday 00:00, Tunis time', () => {
  expect(weekPeriod('2026-11-09')).toEqual({ from: '2026-11-08T23:00:00.000Z', to: '2026-11-14T23:00:00.000Z' })
})

test('the week title names its days, its months and its years', () => {
  expect(weekTitle('2026-11-09')).toBe('Semaine du 9 au 14 novembre 2026')
  expect(weekTitle('2026-11-30')).toBe('Semaine du 30 novembre au 5 décembre 2026')
  expect(weekTitle('2026-12-28')).toBe('Semaine du 28 décembre 2026 au 2 janvier 2027')
})

test('the ISO week number, the month grid and the hour rows', async () => {
  const { isoWeek, monthGrid, monthTitle, hourRow, addMonths } = await import('./week')
  expect(isoWeek('2026-11-09')).toBe(46)
  expect(isoWeek('2026-12-28')).toBe(53)
  expect(isoWeek('2027-01-04')).toBe(1)
  const grid = monthGrid('2026-11-11')
  expect(grid).toHaveLength(42)
  expect(grid[0]).toBe('2026-10-26') // the Monday before 1 November 2026 (a Sunday)
  expect(monthTitle('2026-11-11')).toBe('Novembre 2026')
  expect(addMonths('2026-12-15', 1)).toBe('2027-01-01')
  expect(hourRow('2026-11-09T08:30:00Z')).toBe('09:00') // 09:30 in Tunis
})
