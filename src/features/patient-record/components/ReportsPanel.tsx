import { useId, useState } from 'react'
import { FileText, Lock, Search } from 'lucide-react'
import { Alert, Button, EmptyState, Skeleton } from '@/shared/ui'
import type { Report } from '../types'
import ReportEditor from './ReportEditor'
import { when, type ReportsLoad } from './useReports'
import styles from '../record.module.css'

/** The start of a report in the list: whole words would be nicer, but 160 characters is enough to recognise it. */
const PREVIEW = 160

/** A report on several lines: its first line is its title, the rest its text. One line is text only. */
function split(content: string) {
  const at = content.indexOf('\n')
  const rest = at < 0 ? '' : content.slice(at + 1).trim()
  return at < 0 || !rest || !content.slice(0, at).trim()
    ? { title: null, body: content }
    : { title: content.slice(0, at).trim(), body: rest }
}

/** Lower case, no accents: "Particularité" and "PARTICULARITE" match. */
function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

type Props = {
  patientId: string
  load: ReportsLoad
  onRetry: () => void
  writing: boolean
  onCloseEditor: () => void
  onSaved: () => void
  saved: boolean
}

/** MLink-32 (32.5): the patient's reports, newest first, a keyword filter, and the editor opened from the page header. */
export default function ReportsPanel({ patientId, load, onRetry, writing, onCloseEditor, onSaved, saved }: Props) {
  const titleId = useId()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const reports = load.status === 'ready' ? load.reports : []
  const newest = reports[0]?.id
  const wanted = normalize(term.trim())
  const shown = wanted ? reports.filter((report) => normalize(report.content).includes(wanted)) : reports

  function toggle(id: string) {
    setOpen((ids) => {
      const next = new Set(ids)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.headText}>
          <div className={styles.titleRow}>
            <h3 id={titleId} className={styles.sectionTitle}>
              <span className={styles.titleIcon}>
                <FileText size={18} aria-hidden="true" />
              </span>
              Comptes-rendus
            </h3>
            {load.status === 'ready' && (
              <span data-count className={styles.reportCount}>
                {reports.length}
              </span>
            )}
          </div>
          <p className={styles.sectionHint}>Historique de vos consultations, du plus récent au plus ancien</p>
        </div>
        {reports.length > 0 && (
          <label className={styles.filter}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Filtrer les comptes-rendus"
              placeholder="Filtrer par mot-clé…"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </label>
        )}
      </div>

      {saved && <Alert tone="success">Compte-rendu enregistré.</Alert>}

      {load.status === 'loading' && <Skeleton lines={3} label="Chargement des comptes-rendus…" />}
      {load.status === 'error' && (
        <div className={styles.error}>
          <Alert tone="error">{load.message}</Alert>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        </div>
      )}
      {load.status === 'ready' && reports.length === 0 && (
        <EmptyState icon={FileText} title="Aucun compte-rendu" compact headingLevel={4}>
          Les comptes-rendus de vos consultations avec ce patient apparaîtront ici.
        </EmptyState>
      )}
      {reports.length > 0 && shown.length === 0 && (
        <p className={styles.noMatch}>Aucun compte-rendu ne contient « {term.trim()} ».</p>
      )}
      {shown.length > 0 && (
        <ul className={styles.reports} aria-label="Comptes-rendus enregistrés">
          {shown.map((report: Report) => {
            const { title, body } = split(report.content)
            const long = body.length > PREVIEW
            const whole = open.has(report.id)
            return (
              <li key={report.id} className={styles.report}>
                <div className={styles.reportMeta}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.reportDate}>{when(report.createdAt)}</span>
                  {report.id === newest && <span className={styles.newest}>Le plus récent</span>}
                </div>
                {title && <h4 className={styles.reportTitle}>{title}</h4>}
                <p className={styles.reportText}>{long && !whole ? `${body.slice(0, PREVIEW)}…` : body}</p>
                <div className={styles.reportFoot}>
                  <span className={styles.reportLock}>
                    <Lock size={12} aria-hidden="true" />
                    Chiffré en base
                  </span>
                  {long && (
                    <button type="button" className={styles.more} aria-expanded={whole} onClick={() => toggle(report.id)}>
                      {whole ? 'Réduire' : 'Lire la suite'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {writing && <ReportEditor patientId={patientId} onSaved={onSaved} onCancel={onCloseEditor} />}
    </section>
  )
}
