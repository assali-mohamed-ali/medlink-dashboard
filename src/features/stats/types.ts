/** The indicators of GET /api/admin/stats/export (api-MedLink MLink-95), with the words shown to the person. */
export const INDICATORS = [
  { value: 'APPOINTMENTS_PER_DAY', label: 'Rendez-vous par jour' },
  { value: 'APPOINTMENTS_PER_STATUS', label: 'Rendez-vous par statut' },
  { value: 'APPOINTMENTS_PER_SPECIALTY', label: 'Rendez-vous par spécialité' },
] as const

export type Indicator = (typeof INDICATORS)[number]['value']

/** The period (dates, both ends included) and the indicators asked for. */
export type StatsQuery = {
  /** yyyy-MM-dd */
  from: string
  /** yyyy-MM-dd */
  to: string
  indicators: Indicator[]
}

/** One line of the CSV `indicator,group,count`: the API only sends groups that are large enough to be anonymous. */
export type StatsRow = {
  /** The API's indicator name: it may gain values, so the front keeps it as text. */
  indicator: string
  group: string
  count: number
}

export type StatsExport = {
  /** The file as the API sent it: this is what is downloaded. */
  csv: string
  filename: string
  rows: StatsRow[]
}
