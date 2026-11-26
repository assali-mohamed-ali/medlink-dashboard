import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportStats } from './api'

const QUERY = { from: '2026-01-01', to: '2026-03-31', indicators: ['APPOINTMENTS_PER_DAY', 'APPOINTMENTS_PER_STATUS'] } as const

afterEach(() => {
  vi.unstubAllGlobals()
})

function answer(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('exportStats', () => {
  it('asks for the period and the indicators, and keeps the file and its rows', async () => {
    const csv = 'indicator,group,count\nAPPOINTMENTS_PER_STATUS,CONFIRMED,9\n'
    const fetchMock = answer(
      new Response(csv, {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="stats-2026-01-01_2026-03-31.csv"' },
      }),
    )

    const result = await exportStats({ ...QUERY, indicators: [...QUERY.indicators] })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/api/admin/stats/export?')
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-03-31')
    expect(decodeURIComponent(url)).toContain('indicators=APPOINTMENTS_PER_DAY,APPOINTMENTS_PER_STATUS')
    expect(result.csv).toBe(csv)
    expect(result.filename).toBe('stats-2026-01-01_2026-03-31.csv')
    expect(result.rows).toEqual([{ indicator: 'APPOINTMENTS_PER_STATUS', group: 'CONFIRMED', count: 9 }])
  })

  it('names the file itself when the API does not', async () => {
    answer(new Response('indicator,group,count\n', { status: 200 }))

    const result = await exportStats({ ...QUERY, indicators: [...QUERY.indicators] })

    expect(result.filename).toBe('stats-2026-01-01_2026-03-31.csv')
  })

  it('turns an error answer into an ApiError with the code of the API', async () => {
    answer(
      new Response(JSON.stringify({ code: 'ANONYMISATION_IMPOSSIBLE', message: 'Too few patients' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(exportStats({ ...QUERY, indicators: [...QUERY.indicators] })).rejects.toMatchObject({
      status: 422,
      code: 'ANONYMISATION_IMPOSSIBLE',
    })
  })
})
