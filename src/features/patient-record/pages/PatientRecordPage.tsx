import { useEffect, useId, useState } from 'react'
import { ArrowLeft, IdCard } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import StatusPage from '@/shared/components/StatusPage'
import UserAvatar from '@/shared/components/UserAvatar'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Skeleton } from '@/shared/ui'
import { fetchPatientRecord } from '../api'
import ReportsPanel from '../components/ReportsPanel'
import type { PatientRecord } from '../types'
import styles from '../record.module.css'

type Load =
  | { status: 'loading' }
  | { status: 'ready'; record: PatientRecord }
  | { status: 'refused' }
  | { status: 'error'; message: string }

/** What the last answer was for (a patient and an attempt); another key means it is not the current one. */
type Answer = { key: string; load: Load }


/** "12 mars 1985 (41 ans)": the date as written, the age on today's date. */
function birthLabel(birthDate: string, today: Date) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  const age = today.getUTCFullYear() - year - (beforeBirthday ? 1 : 0)
  return `${date} (${age} an${age > 1 ? 's' : ''})`
}

/**
 * MLink-31 (31.4): the record of a patient the practitioner has an appointment with, opened from the agenda. It lives
 * in this page's state only: never in the browser's storage.
 */
export default function PatientRecordPage() {
  const { patientId = '' } = useParams()
  const titleId = useId()
  const identityId = useId()
  const [today] = useState(() => new Date())
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)

  const key = `${patientId}#${attempt}`
  const load: Load = answer?.key === key ? answer.load : { status: 'loading' }

  useEffect(() => {
    let current = true
    fetchPatientRecord(patientId).then(
      (record) => current && setAnswer({ key, load: { status: 'ready', record } }),
      (error) => {
        if (!current) return
        // 403: not attached, unknown or malformed id (one answer for the three): nothing to try again
        const refused = error instanceof ApiError && error.status === 403
        setAnswer({ key, load: refused ? { status: 'refused' } : { status: 'error', message: messageFor(error) } })
      },
    )
    return () => {
      current = false
    }
  }, [patientId, key])

  const patient = load.status === 'ready' ? load.record.patient : null

  // MLink-31 (31.5): the "Accès refusé" screen of 16.5, inside the space, with no data of any patient
  if (load.status === 'refused') {
    return (
      // data-width: on the same sage background as the agenda and the record
      <div data-width="wide">
        <StatusPage inLayout title="Accès refusé" action={{ label: 'Retour à l’agenda', to: paths.practitioner.agenda }}>
          <p>Ce patient n’est pas rattaché à votre agenda.</p>
        </StatusPage>
      </div>
    )
  }

  return (
    <section aria-labelledby={titleId} className={styles.page} data-width="wide">
      <Link to={paths.practitioner.agenda} className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Retour à l’agenda
      </Link>

      <header>
        <p className={styles.eyebrow}>Dossier patient</p>
        <h2 id={titleId} className={styles.title}>
          {patient ? `${patient.firstName} ${patient.lastName}` : 'Dossier patient'}
        </h2>
      </header>

      {load.status === 'loading' && <Skeleton lines={5} label="Chargement du dossier…" />}

      {load.status === 'error' && (
        <div className={styles.error}>
          <Alert tone="error">{load.message}</Alert>
          <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </Button>
        </div>
      )}

      {load.status === 'ready' && patient && (
        <div className={styles.layout}>
          <section aria-labelledby={identityId} className={styles.card}>
            <h3 id={identityId} className={styles.cardTitle}>
              <IdCard size={16} aria-hidden="true" />
              Identité du patient
            </h3>
            <div className={styles.who}>
              <UserAvatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
              <span className={styles.name}>
                {patient.firstName} {patient.lastName}
              </span>
            </div>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>Date de naissance</dt>
                <dd>{birthLabel(patient.birthDate, today)}</dd>
              </div>
              <div className={styles.fact}>
                <dt>Téléphone</dt>
                <dd>{patient.phone || 'Non renseigné'}</dd>
              </div>
            </dl>
          </section>

          <ReportsPanel patientId={patientId} />
        </div>
      )}
    </section>
  )
}
