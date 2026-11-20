import { apiFetchText } from '@/shared/api/apiClient'
import { parseStats } from './csv'
import type { StatsExport, StatsQuery } from './types'

/**
 * GET /api/admin/stats/export (staff only): anonymised statistics of the appointments, as a CSV file.
 * The CSV is kept as the API sent it (it is what the person downloads) and also read into rows to show.
 */
export async function exportStats({ from, to, indicators }: StatsQuery): Promise<StatsExport> {
  const params = new URLSearchParams({ from, to, indicators: indicators.join(',') })
  const { text, filename } = await apiFetchText(`/admin/stats/export?${params.toString()}`)
  return { csv: text, filename: filename ?? `stats-${from}_${to}.csv`, rows: parseStats(text) }
}
