import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ChartColumn } from 'lucide-react'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Card, EmptyState, Skeleton, TextField } from '@/shared/ui'
import { exportStats } from '../api'
import { INDICATORS } from '../types'
import type { Indicator, StatsExport } from '../types'
import styles from './StatsExportPage.module.css'

type Draft = { from: string; to: string; indicators: Indicator[] }
type Errors = { from?: string; to?: string; indicators?: string }

const EMPTY: Draft = { from: '', to: '', indicators: ['APPOINTMENTS_PER_STATUS'] }

function validMonth(from: string, to: string): boolean {
  const [y = 0, m = 0] = from.split('-').map(Number)
  const end = new Date(Date.UTC(y, m, 0))
  const today = new Date().toISOString().slice(0, 10)
  return from.endsWith('-01') && Number.isFinite(end.getTime()) &&
    to === end.toISOString().slice(0, 10) && to < today
}

/** What the person typed, checked before asking the API: the message to show under each wrong field. */
function check(draft: Draft): Errors {
  const errors: Errors = {}
  if (!draft.from) errors.from = 'Choisissez la date de début.'
  if (!draft.to) errors.to = 'Choisissez la date de fin.'
  if (draft.from && draft.to) {
    if (!validMonth(draft.from, draft.to)) errors.to = 'Choisissez un mois civil terminé, du premier au dernier jour.'
  }
  if (draft.indicators.length !== 1) errors.indicators = 'Choisissez un seul indicateur.'
  return errors
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'ANONYMISATION_IMPOSSIBLE') {
      return (
        'Ces statistiques ne peuvent pas être fournies : pour au moins un indicateur, il y a trop peu de patients ' +
        'par groupe pour protéger leur anonymat. Cette publication est figée pour le mois choisi.'
      )
    }
    if (error.code === 'STATS_PARTITION_LOCKED') {
      return 'Un autre indicateur a déjà été choisi pour ce mois. Les exports croisés sont interdits.'
    }
    if (error.code === 'VALIDATION_FAILED') {
      return 'La période ou les indicateurs choisis ne sont pas valides. Vérifiez-les puis réessayez.'
    }
  }
  return messageFor(error)
}

function indicatorLabel(name: string): string {
  return INDICATORS.find((indicator) => indicator.value === name)?.label ?? name
}

/** Gives the file to the browser as a download, then lets go of it. */
function download(file: StatsExport) {
  const url = URL.createObjectURL(new Blob([file.csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** The anonymised statistics for the administrative staff (MLink-95): choose a period and indicators, read, download. */
export default function StatsExportPage() {
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [file, setFile] = useState<StatsExport | null>(null)

  function toggle(indicator: Indicator) {
    setDraft({ ...draft, indicators: [indicator] })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const found = check(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setLoading(true)
    setMessage(null)
    setFile(null)
    try {
      setFile(await exportStats(draft))
    } catch (error: unknown) {
      setMessage(messageOf(error))
    } finally {
      setLoading(false)
    }
  }

  let result: ReactNode
  if (loading) {
    result = <Skeleton lines={4} label="Calcul des statistiques…" />
  } else if (message !== null) {
    result = <Alert tone="error">{message}</Alert>
  } else if (file && file.rows.length === 0) {
    result = (
      <EmptyState icon={ChartColumn} title="Aucune donnée" compact>
        Le fichier reçu ne contient aucune ligne.
      </EmptyState>
    )
  } else if (file) {
    result = (
      <>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">Statistiques anonymisées des rendez-vous</caption>
            <thead>
              <tr>
                <th scope="col">Indicateur</th>
                <th scope="col">Groupe</th>
                <th scope="col" className={styles.number}>
                  Rendez-vous
                </th>
              </tr>
            </thead>
            <tbody>
              {file.rows.map((row, index) => (
                <tr key={`${row.indicator}-${row.group}-${index}`}>
                  <td>{indicatorLabel(row.indicator)}</td>
                  <td>{row.group}</td>
                  <td className={styles.number}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          Pour protéger les patients, les groupes trop petits ne sont pas affichés et le résultat reste figé.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => download(file)}>Télécharger le fichier CSV</Button>
        </div>
      </>
    )
  } else {
    result = (
      <EmptyState icon={ChartColumn} title="Aucun résultat pour le moment" compact>
        Choisissez une période puis lancez l’export.
      </EmptyState>
    )
  }

  return (
    <>
      <h2>Statistiques</h2>
      <p className={styles.intro}>
        Des chiffres agrégés sur les rendez-vous des cliniques, à lire ici ou à télécharger en fichier CSV.
        Un seul indicateur est publié par mois civil terminé, pour limiter les recoupements. Le premier export
        fixe définitivement l’indicateur et son résultat pour ce mois.
      </p>
      <div className={styles.workspace}>
      <Card title="Période et indicateurs" headingLevel={3}>
        <form onSubmit={submit} noValidate aria-label="Export des statistiques">
          <TextField label="Mois civil terminé" type="month"
            max={new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 0)).toISOString().slice(0, 7)}
            value={validMonth(draft.from, draft.to) ? draft.from.slice(0, 7) : ''}
            onChange={event => {
              const value = event.target.value
              const [year = 0, month = 0] = value.split('-').map(Number)
              if (!value || !year || month < 1 || month > 12) {
                setDraft(current => ({ ...current, from: '', to: '' }))
                return
              }
              setDraft(current => ({ ...current, from: `${value}-01`, to: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) }))
              setErrors({})
            }} />
          <div className={styles.dates}>
            <TextField
              label="Date de début"
              type="date"
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
              error={errors.from}
            />
            <TextField
              label="Date de fin"
              type="date"
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
              error={errors.to}
            />
          </div>
          <fieldset className={styles.indicators}>
            <legend>Indicateurs</legend>
            {INDICATORS.map((indicator) => (
              <label key={indicator.value} className={styles.choice}>
                <input
                  type="radio"
                  name="stats-indicator"
                  checked={draft.indicators.includes(indicator.value)}
                  onChange={() => toggle(indicator.value)}
                />
                {indicator.label}
              </label>
            ))}
            {errors.indicators && (
              <p className={styles.error} role="alert">
                {errors.indicators}
              </p>
            )}
          </fieldset>
          <div className={styles.actions}>
            <Button type="submit" disabled={loading}>
              Exporter les statistiques
            </Button>
          </div>
        </form>
      </Card>
      <div className={styles.stack}>
        <Card title="Règles de confidentialité" headingLevel={3}>
          <dl className={styles.rules}><div><dt>Mois terminé</dt><dd>Aucune période partielle.</dd></div><div><dt>Publication immuable</dt><dd>Un seul indicateur, résultat figé.</dd></div><div><dt>Petits groupes</dt><dd>La publication est refusée si l’anonymisation est impossible.</dd></div></dl>
        </Card>
        <Card title="Résultat" headingLevel={3}>{result}</Card>
      </div>
      </div>
    </>
  )
}
