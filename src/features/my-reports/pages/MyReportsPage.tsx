import { useEffect, useId, useState } from 'react'
import { FileText, Stethoscope } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, EmptyState, Skeleton } from '@/shared/ui'
import { fetchMyReports } from '../api'
import type { MyReport } from '../types'
import styles from './MyReportsPage.module.css'

/** The start of a long report: the rest on demand ("Lire la suite"). */
const PREVIEW = 240

type Load = { status: 'loading' } | { status: 'ready'; reports: MyReport[] } | { status: 'error'; message: string }
type Answer = { key: number; load: Load }

/** "11 novembre 2026 à 10:15", Tunis time. */
function when(createdAt: string) {
  const date = new Date(createdAt)
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Tunis' })
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })
  return `${day} à ${time}`
}

/**
 * MLink-32 follow-up: the patient reads the consultation reports written about them, newest first, with the doctor
 * who wrote each one. Read only: a report is written by the practitioner, once the consultation has started.
 */
export default function MyReportsPage() {
  const titleId = useId()
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let current = true
    fetchMyReports().then(
      (reports) => {
        if (!current) return
        const sorted = [...reports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        setAnswer({ key: attempt, load: { status: 'ready', reports: sorted } })
      },
      (error) => current && setAnswer({ key: attempt, load: { status: 'error', message: messageFor(error) } }),
    )
    return () => {
      current = false
    }
  }, [attempt])

  const load: Load = answer?.key === attempt ? answer.load : { status: 'loading' }

  function toggle(id: string) {
    setOpen((ids) => {
      const next = new Set(ids)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <section aria-labelledby={titleId} className={styles.page}>
      <header className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          Mes comptes-rendus
        </h2>
        <p className={styles.subtitle}>Les comptes-rendus de vos consultations, du plus récent au plus ancien</p>
      </header>

      {load.status === 'loading' && <Skeleton lines={4} label="Chargement de vos comptes-rendus…" />}
      {load.status === 'error' && (
        <div className={styles.error}>
          <Alert tone="error">{load.message}</Alert>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </Button>
        </div>
      )}
      {load.status === 'ready' && load.reports.length === 0 && (
        <EmptyState icon={FileText} title="Aucun compte-rendu pour l’instant" headingLevel={3}>
          Après une consultation, le compte-rendu de votre médecin apparaîtra ici.
        </EmptyState>
      )}
      {load.status === 'ready' && load.reports.length > 0 && (
        <ul className={styles.reports} aria-label="Vos comptes-rendus">
          {load.reports.map((report) => {
            const long = report.content.length > PREVIEW
            const whole = open.has(report.id)
            const { firstName, lastName, specialty } = report.practitioner
            return (
              <li key={report.id} className={styles.report}>
                <div className={styles.meta}>
                  <span className={styles.author}>
                    <span className={styles.icon} aria-hidden="true">
                      <Stethoscope size={18} />
                    </span>
                    Dr {firstName} {lastName}
                  </span>
                  <span className={styles.specialty}>{specialty}</span>
                  <span className={styles.date}>{when(report.createdAt)}</span>
                </div>
                <p className={styles.text}>{long && !whole ? `${report.content.slice(0, PREVIEW)}…` : report.content}</p>
                {long && (
                  <button type="button" className={styles.more} aria-expanded={whole} onClick={() => toggle(report.id)}>
                    {whole ? 'Réduire' : 'Lire la suite'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
