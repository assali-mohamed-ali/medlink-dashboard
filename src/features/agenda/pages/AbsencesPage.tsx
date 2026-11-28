import styles from '@/shared/ui/WorkflowPage.module.css'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, TextField } from '@/shared/ui'
import {
  declareAbsence, decideAffectedAppointment, fetchAbsences, fetchAffectedAppointments,
  type Absence, type AffectedAppointment,
} from '../api'

const dateTime = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Tunis',
})

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>()
  const [selected, setSelected] = useState<Absence>()
  const [affected, setAffected] = useState<AffectedAppointment[]>()
  const [decision, setDecision] = useState<{ id: string; action: 'CANCEL' | 'POSTPONE' }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    fetchAbsences().then(
      (data) => { if (current) setAbsences(data) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function run(operation: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  async function select(absence: Absence) {
    setSelected(absence)
    setAffected(undefined)
    setDecision(undefined)
    setAffected(await fetchAffectedAppointments(absence.id))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const startsAt = new Date(`${fields.get('start')}:00+01:00`)
    const endsAt = new Date(`${fields.get('end')}:00+01:00`)
    if (!(endsAt > startsAt)) {
      setError('La fin de l’absence doit suivre son début.')
      return
    }
    const form = event.currentTarget
    void run(async () => {
      const saved = await declareAbsence(startsAt.toISOString(), endsAt.toISOString(), String(fields.get('reason')))
      setAbsences((list) => [saved, ...(list ?? [])].sort((a, b) => b.startsAt.localeCompare(a.startsAt)))
      form.reset()
      await select(saved)
      setNotice('Absence enregistrée.')
    })
  }

  return (
    <Card title="Mes absences">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className={styles.feedback}><strong>Disponibilités et absences</strong><p>Les créneaux libres de vos cliniques seront fermés pendant cette période. Examinez les rendez-vous concernés.</p><Link to={`${paths.practitioner.agenda}?ajouter`}>Ajouter une disponibilité depuis l’agenda</Link></div>
      <form className={styles.fields} onSubmit={submit}>
        <TextField id="absence-start" name="start" label="Début (heure de Tunisie)" type="datetime-local" required />
        <TextField id="absence-end" name="end" label="Fin (heure de Tunisie)" type="datetime-local" required />
        <TextField id="absence-reason" name="reason" label="Motif facultatif" maxLength={200} />
        <Button type="submit" disabled={busy}>Déclarer l’absence</Button>
      </form>
      {!absences && !error && <p role="status">Chargement des absences…</p>}
      {absences?.length === 0 && <p>Aucune absence déclarée.</p>}
      {absences && <ul className={styles.rows}>{absences.map((absence) => (
        <li key={absence.id}>
          <Button variant={selected?.id === absence.id ? "primary" : "secondary"} aria-pressed={selected?.id === absence.id} disabled={busy} onClick={() => void run(() => select(absence))}>
            {dateTime.format(new Date(absence.startsAt))} – {dateTime.format(new Date(absence.endsAt))}
          </Button>
        </li>
      ))}</ul>}
      {selected && (
        <section className={styles.impact} aria-label="Rendez-vous à traiter">
          <h3>Rendez-vous à traiter</h3>
          {selected.reason && <p>{selected.reason}</p>}
          {!affected && !error && <p role="status">Chargement des rendez-vous…</p>}
          {affected?.length === 0 && <p>Aucun rendez-vous à traiter pour cette absence.</p>}
          {affected && <ul className={styles.rows}>{affected.map((appointment) => (
            <li key={appointment.appointmentId}>
              <p>{appointment.patientFirstName} {appointment.patientLastName} · {appointment.clinic} ·{' '}
                {dateTime.format(new Date(appointment.startsAt))}</p>
              <Button variant="danger" disabled={busy} onClick={() => setDecision({ id: appointment.appointmentId, action: 'CANCEL' })}>Annuler le rendez-vous</Button>
              <Button variant="secondary" disabled={busy} onClick={() => setDecision({ id: appointment.appointmentId, action: 'POSTPONE' })}>Reporter à la semaine suivante</Button>
              {decision?.id === appointment.appointmentId && (
                <div>
                  <p>{decision.action === 'CANCEL' ? 'Confirmer l’annulation de ce rendez-vous ?' :
                    'Confirmer le report à la même heure la semaine suivante ?'}</p>
                  <Button disabled={busy} onClick={() => void run(async () => {
                    await decideAffectedAppointment(decision.id, decision.action)
                    setAffected((list) => list?.filter((row) => row.appointmentId !== decision.id))
                    setDecision(undefined)
                    setNotice('Décision enregistrée.')
                  })}>Confirmer la décision</Button>
                  <Button disabled={busy} onClick={() => setDecision(undefined)}>Revenir</Button>
                </div>
              )}
            </li>
          ))}</ul>}
        </section>
      )}
    </Card>
  )
}
