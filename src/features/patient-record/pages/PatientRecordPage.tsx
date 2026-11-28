import PublishResultForm from "../components/PublishResultForm"
import { useEffect, useId, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Cake, IdCard, Clock, FileText, Lock, Plus, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import StatusPage from '@/shared/components/StatusPage'
import UserAvatar from '@/shared/components/UserAvatar'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Skeleton } from '@/shared/ui'
import { fetchPatientRecord } from '../api'
import ReportsPanel from '../components/ReportsPanel'
import { useReports, when } from '../components/useReports'
import type { PatientIdentity, PatientRecord } from '../types'
import styles from '../record.module.css'

type Load =
  | { status: 'loading' }
  | { status: 'ready'; record: PatientRecord }
  | { status: 'refused' }
  | { status: 'error'; message: string }

/** What the last answer was for (a patient and an attempt); another key means it is not the current one. */
type Answer = { key: string; load: Load }

/** { date: "12 mars 1985", age: "41 ans" }: the date as written, the age on today's date. */
function birth(birthDate: string, today: Date) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  const years = today.getUTCFullYear() - year - (beforeBirthday ? 1 : 0)
  return { date, age: `${years} an${years > 1 ? 's' : ''}` }
}

/**
 * MLink-31 (31.4): the record of a patient the practitioner has an appointment with, opened from the agenda. It lives
 * in this page's state only: never in the browser's storage.
 */
export default function PatientRecordPage() {
  const { patientId = '' } = useParams()
  const titleId = useId()
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
      <nav aria-label="Fil d’Ariane" className={styles.crumbs}>
        <Link to={paths.practitioner.agenda} className={styles.back}>
          <ArrowLeft size={16} aria-hidden="true" />
          Retour à l’agenda
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={paths.practitioner.patients}>Mes patients</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className={styles.crumbHere}>
          Dossier patient
        </span>
      </nav>

      {load.status === 'ready' ? (
        <Record
          key={patientId}
          titleId={titleId}
          patientId={patientId}
          patient={load.record.patient}
          canWrite={load.record.canWriteReport}
        />
      ) : (
        <>
          <h2 id={titleId} className={styles.title}>
            Dossier patient
          </h2>
          {load.status === 'loading' && <Skeleton lines={5} label="Chargement du dossier…" />}
          {load.status === 'error' && (
            <div className={styles.error}>
              <Alert tone="error">{load.message}</Alert>
              <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                Réessayer
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

type RecordProps = { titleId: string; patientId: string; patient: PatientIdentity; canWrite: boolean }

/** The record once read: the header with the yellow action, the four facts, the identity and the reports. */
function Record({ titleId, patientId, patient, canWrite }: RecordProps) {
  const identityId = useId()
  const notYetId = useId()
  const [today] = useState(() => new Date())
  const reports = useReports(patientId)
  const [section, setSection] = useState<'all' | 'identity' | 'reports' | 'results'>('all')
  const [writing, setWriting] = useState(false)
  const [saved, setSaved] = useState(false)
  const newButton = useRef<HTMLButtonElement>(null)
  const { date, age } = birth(patient.birthDate, today)
  const name = `${patient.firstName} ${patient.lastName}`

  function closeEditor() {
    setWriting(false)
    newButton.current?.focus()
  }

  const list = reports.load.status === 'ready' ? reports.load.reports : null
  const pending = reports.load.status === 'loading' ? '…' : '—'

  return (
    <>
      <header className={styles.head}>
        <div className={styles.headText}>
          <div className={styles.titleRow}>
            <h2 id={titleId} className={styles.title}>
              {name}
            </h2>
            <span className={styles.attached}>
              <span className={styles.attachedDot} aria-hidden="true" />
              Rattaché à votre agenda</span>
          </div>
          <p className={styles.subtitle}>{patient.recordNumber ? `${patient.recordNumber} · ` : ''}{`${age} · né(e) le ${date}`}</p>
        </div>
        <button
          ref={newButton}
          type="button"
          className={styles.newReport}
          aria-expanded={canWrite ? writing : undefined}
          // MLink-32 follow-up: no report before the consultation has ended (the API refuses it too)
          disabled={!canWrite}
          aria-describedby={canWrite ? undefined : notYetId}
          onClick={() => {
            setSaved(false)
            setSection('reports')
            setWriting(true)
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Nouveau compte-rendu
        </button>
        {!canWrite && (
          <p id={notYetId} className={styles.notYet}>
            Vous pourrez écrire le compte-rendu une fois la consultation terminée.
          </p>
        )}
      </header>

      <ul aria-label="En bref" className={styles.glance}>
        <Fact icon={Cake} tone={1} label="Âge" value={age} note={date} />
        <Fact icon={FileText} tone={2} label="Comptes-rendus" value={list ? String(list.length) : pending} note="enregistrés" />
        <Fact
          icon={Clock}
          tone={3}
          label="Dernier compte-rendu"
          compact
          value={list ? (list[0] ? when(list[0].createdAt) : 'Aucun') : pending}
        />
        <Fact icon={Lock} tone={4} label="Confidentialité" value="Chiffré" note="AES-256" />
      </ul>

      <nav className={styles.sectionLinks} aria-label="Sections du dossier">
        {([['all', 'Synthèse'], ['identity', 'Identité'], ['reports', 'Comptes-rendus'], ['results', 'Résultats et pièces jointes']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)}>{label}</button>)}
      </nav>
      <div className={styles.layout} data-single={section !== "all" || undefined}>
        <section hidden={section !== "all" && section !== "identity"} id="dossier-identite" aria-labelledby={identityId} className={styles.card}>
          <h3 id={identityId} className={styles.sectionTitle}>
            <span className={styles.titleIcon}>
              <IdCard size={18} aria-hidden="true" />
            </span>
            Identité du patient
          </h3>
          <div className={styles.who}>
            <UserAvatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
            <div className={styles.whoText}>
              <span className={styles.name}>{name}</span>
              <span className={styles.whoNote}>Dossier consulté par vous, tracé dans le journal d’audit</span>
            </div>
          </div>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>Date de naissance</dt>
              <dd>
                <span>{date}</span>
                <span className={styles.age}>{age}</span>
              </dd>
            </div>
            <div className={styles.fact}>
              <dt>Téléphone</dt>
              <dd>{patient.phone || 'Non renseigné'}</dd>
            </div>
            {patient.recordNumber && (
              <div className={styles.fact}>
                <dt>N° de dossier</dt>
                <dd>{patient.recordNumber}</dd>
              </div>
            )}
          </dl>
          <p className={styles.shield}>
            <ShieldCheck size={18} aria-hidden="true" />
            Seuls les praticiens qui ont un rendez-vous avec ce patient voient ce dossier. Chaque lecture est journalisée.
          </p>
        </section>

        <div className={styles.recordContent} hidden={section === "identity"}>
        <div hidden={section === "results"} id="dossier-comptes-rendus" className={styles.sectionTarget}>
        <ReportsPanel
          patientId={patientId}
          load={reports.load}
          onRetry={reports.reload}
          writing={writing}
          onCloseEditor={closeEditor}
          onSaved={() => {
            setSaved(true)
            closeEditor()
            reports.reload()
          }}
          saved={saved}
        />
        </div>
        <div hidden={section === "reports"} id="dossier-resultats" className={styles.sectionTarget}><PublishResultForm key={patientId} patientId={patientId} /></div>
        </div>
      </div>
    </>
  )
}

type FactProps = { icon: LucideIcon; tone: 1 | 2 | 3 | 4; label: string; value: string; note?: string; compact?: boolean }

function Fact({ icon: Icon, tone, label, value, note, compact = false }: FactProps) {
  return (
    <li className={styles.glanceItem}>
      <span className={styles.glanceIcon} data-tone={tone}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className={styles.glanceText}>
        <span className={styles.glanceLabel}>{label}</span>
        <span className={styles.glanceValue} data-compact={compact || undefined}>
          {value}
        </span>
        {note && <span className={styles.glanceNote}>{note}</span>}
      </span>
    </li>
  )
}
