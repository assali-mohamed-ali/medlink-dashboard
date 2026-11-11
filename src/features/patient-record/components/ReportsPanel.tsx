import { useEffect, useId, useRef, useState } from 'react'
import { FilePlus2, FileText } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, EmptyState, Skeleton } from '@/shared/ui'
import { fetchReports } from '../api'
import type { Report } from '../types'
import ReportEditor from './ReportEditor'
import styles from '../record.module.css'

type Load = { status: 'loading' } | { status: 'ready'; reports: Report[] } | { status: 'error'; message: string }
type Answer = { key: number; load: Load }

/** The start of a report in the list: whole words would be nicer, but 160 characters is enough to recognise it. */
const PREVIEW = 160

/** "5 novembre 2026 à 16:00", Tunis time. */
function when(createdAt: string) {
  const date = new Date(createdAt)
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Tunis' })
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })
  return `${day} à ${time}`
}

function preview(content: string) {
  return content.length > PREVIEW ? `${content.slice(0, PREVIEW)}…` : content
}

/** MLink-32 (32.5): the patient's reports, newest first, and the editor to write a new one. */
export default function ReportsPanel({ patientId }: { patientId: string }) {
  const titleId = useId()
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [writing, setWriting] = useState(false)
  const [saved, setSaved] = useState(false)
  const newButton = useRef<HTMLButtonElement>(null)

  // After a save the list already shown stays while it is read again (no flash)
  const load: Load =
    answer?.key === attempt || answer?.load.status === 'ready' ? answer.load : { status: 'loading' }

  useEffect(() => {
    let current = true
    fetchReports(patientId).then(
      (reports) => current && setAnswer({ key: attempt, load: { status: 'ready', reports } }),
      (error) => current && setAnswer({ key: attempt, load: { status: 'error', message: messageFor(error) } }),
    )
    return () => {
      current = false
    }
  }, [patientId, attempt])

  function closeEditor() {
    setWriting(false)
    newButton.current?.focus()
  }

  function onSaved() {
    setSaved(true)
    closeEditor()
    setAttempt((n) => n + 1)
  }

  const reports =
    load.status === 'ready' ? [...load.reports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : []

  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <div className={styles.cardHead}>
        <h3 id={titleId} className={styles.cardTitle}>
          <FileText size={16} aria-hidden="true" />
          Comptes-rendus
        </h3>
        <button
          ref={newButton}
          type="button"
          className={styles.newReport}
          aria-expanded={writing}
          onClick={() => {
            setSaved(false)
            setWriting(true)
          }}
          disabled={writing}
        >
          <FilePlus2 size={16} aria-hidden="true" />
          Nouveau compte-rendu
        </button>
      </div>

      {saved && <Alert tone="success">Compte-rendu enregistré.</Alert>}
      {writing && <ReportEditor patientId={patientId} onSaved={onSaved} onCancel={closeEditor} />}

      {load.status === 'loading' && <Skeleton lines={3} label="Chargement des comptes-rendus…" />}
      {load.status === 'error' && (
        <div className={styles.error}>
          <Alert tone="error">{load.message}</Alert>
          <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </Button>
        </div>
      )}
      {load.status === 'ready' &&
        (reports.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun compte-rendu" compact headingLevel={4}>
            Les comptes-rendus de vos consultations avec ce patient apparaîtront ici.
          </EmptyState>
        ) : (
          <ul className={styles.reports} aria-label="Comptes-rendus enregistrés">
            {reports.map((report) => (
              <li key={report.id} className={styles.report}>
                <span className={styles.reportDate}>{when(report.createdAt)}</span>
                <span className={styles.reportText}>{preview(report.content)}</span>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
