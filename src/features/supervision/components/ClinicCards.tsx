import styles from './ClinicCards.module.css'
import { useEffect, useState } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Card, Skeleton } from '@/shared/ui'
import { fetchClinicActivity, fetchClinics } from '../api'
import type { ClinicActivity, ClinicSummary } from '../types'
import { weekPeriod, weekTitle } from '../week'

type Result<T> = { data: T } | { failure: string } | null

function ClinicCard({ clinic, monday }: { clinic: ClinicSummary; monday: string }) {
  const [result, setResult] = useState<Result<ClinicActivity>>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    const { from, to } = weekPeriod(monday)
    fetchClinicActivity(clinic.id, from, to).then(
      (data) => current && setResult({ data }),
      (error) => current && setResult({ failure: messageFor(error) }),
    )
    return () => { current = false }
  }, [clinic.id, monday, attempt])

  return (
    <Card title={clinic.name} headingLevel={4} className={styles.card}>
      {result === null ? (
        <Skeleton lines={2} label={`Chargement de ${clinic.name}`} />
      ) : 'failure' in result ? (
        <>
          <Alert tone="error">{result.failure}</Alert>
          <Button variant="ghost" onClick={() => { setResult(null); setAttempt((count) => count + 1) }}>
            Réessayer
          </Button>
        </>
      ) : (
        <dl className={styles.metrics}>
          <dt>Rendez-vous réservés</dt><dd>{result.data.BOOKED}</dd>
          <dt>Rendez-vous annulés</dt><dd>{result.data.CANCELLED}</dd>
          <dt>Taux d’occupation</dt>
          <dd>{result.data.OCCUPANCY_PERCENT === undefined ? 'Indisponible' :
            result.data.OPEN_SLOTS === 0 && result.data.BOOKED_SLOTS === 0 ? 'Aucun créneau' :
              `${result.data.OCCUPANCY_PERCENT} %`}</dd>
          {typeof result.data.OCCUPANCY_PERCENT === 'number' && result.data.OPEN_SLOTS !== undefined && result.data.BOOKED_SLOTS !== undefined && result.data.OPEN_SLOTS + result.data.BOOKED_SLOTS > 0 && <div className={styles.progress} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, result.data.OCCUPANCY_PERCENT))}%` }} /></div>}
          {result.data.OPEN_SLOTS !== undefined && <>
            <dt>Créneaux libres</dt><dd>{result.data.OPEN_SLOTS}</dd>
            <dt>Créneaux réservés</dt><dd>{result.data.BOOKED_SLOTS}</dd>
            <dt>Créneaux fermés</dt><dd>{result.data.CLOSED_SLOTS}</dd>
          </>}
        </dl>
      )}
    </Card>
  )
}

export default function ClinicCards({ monday, clinicId = '' }: { monday: string; clinicId?: string }) {
  const [result, setResult] = useState<Result<ClinicSummary[]>>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    fetchClinics().then(
      (data) => current && setResult({ data }),
      (error) => current && setResult({ failure: messageFor(error) }),
    )
    return () => { current = false }
  }, [attempt])

  return (
    <section className={styles.section} aria-label="Activité par clinique">
      <h3>Activité par clinique</h3>
      <p>{weekTitle(monday)}</p>
      {result === null ? (
        <Skeleton lines={2} label="Chargement des cliniques" />
      ) : 'failure' in result ? (
        <>
          <Alert tone="error">{result.failure}</Alert>
          <Button variant="ghost" onClick={() => { setResult(null); setAttempt((count) => count + 1) }}>
            Réessayer
          </Button>
        </>
      ) : result.data.length === 0 ? (
        <p>Aucune clinique.</p>
      ) : <div className={styles.grid}>{result.data.filter(clinic => !clinicId || clinic.id === clinicId).map((clinic) => (
        <ClinicCard key={`${clinic.id}:${monday}`} clinic={clinic} monday={monday} />
      ))}</div>}
    </section>
  )
}
