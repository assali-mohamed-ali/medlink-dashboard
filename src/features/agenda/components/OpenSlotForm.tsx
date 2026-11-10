import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'
import { Alert, Button, Select, TextField } from '@/shared/ui'
import { openSlot } from '../api'
import { sortedClinics } from '../clinicTones'
import type { AgendaItem, ClinicRef } from '../types'
import { tunisInstant } from '../week'
import styles from '../agenda.module.css'

type Field = 'clinicId' | 'date' | 'startsAt' | 'endsAt'
type Errors = Partial<Record<Field, string>>

type Props = {
  id: string
  clinics: readonly ClinicRef[]
  /** The date proposed first (today, Tunis). */
  today: string
  onOpened: (slot: AgendaItem) => void
  onCancel: () => void
}

/** What the form checks itself; the API checks the rest (future, length, overlap) and its messages land here too. */
function check(clinicId: string, date: string, start: string, end: string): Errors {
  const errors: Errors = {}
  if (!clinicId) errors.clinicId = 'Choisissez une clinique.'
  if (!date) errors.date = 'Indiquez la date.'
  if (!start) errors.startsAt = 'Indiquez l’heure de début.'
  if (!end) errors.endsAt = 'Indiquez l’heure de fin.'
  else if (start && end <= start) errors.endsAt = 'La fin doit être après le début.'
  return errors
}

/**
 * MLink-26 (26.8): opens a slot in one of the practitioner's clinics. Times are typed in Tunis time and sent as
 * instants; the request leaves once, however many clicks.
 */
export default function OpenSlotForm({ id, clinics, today, onOpened, onCancel }: Props) {
  const [clinicId, setClinicId] = useState('')
  const [date, setDate] = useState(today)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const firstField = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    firstField.current?.focus()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sendingRef.current) return
    const found = check(clinicId, date, start, end)
    setErrors(found)
    setFailure(null)
    if (Object.keys(found).length > 0) return

    sendingRef.current = true
    setSending(true)
    try {
      onOpened(await openSlot({ clinicId, startsAt: tunisInstant(date, start), endsAt: tunisInstant(date, end) }))
    } catch (error) {
      const perField = error instanceof ApiError && error.code === 'VALIDATION_FAILED'
        ? fieldErrors(error.details, ['clinicId', 'startsAt', 'endsAt'] as const)
        : {}
      if (Object.keys(perField).length > 0) setErrors(perField)
      else setFailure(messageFor(error))
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <form id={id} aria-label="Ouvrir un créneau" className={styles.openForm} noValidate onSubmit={submit}>
      <div className={styles.openHead}>
        <h3 className={styles.panelTitle}>Ouvrir un créneau</h3>
        <p className={styles.weekSubtitle}>Heure de Tunis (GMT+1)</p>
      </div>
      {failure && <Alert tone="error">{failure}</Alert>}
      <div className={styles.openFields}>
        <Select
          ref={firstField}
          label="Clinique"
          value={clinicId}
          error={errors.clinicId}
          onChange={(event) => setClinicId(event.target.value)}
        >
          <option value="">Choisissez une clinique</option>
          {sortedClinics(clinics).map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </Select>
        <TextField label="Date" type="date" value={date} error={errors.date} onChange={(event) => setDate(event.target.value)} />
        <TextField label="Début" type="time" value={start} error={errors.startsAt} onChange={(event) => setStart(event.target.value)} />
        <TextField label="Fin" type="time" value={end} error={errors.endsAt} onChange={(event) => setEnd(event.target.value)} />
      </div>
      <div className={styles.openActions}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={sending}>
          Ouvrir le créneau
        </Button>
      </div>
    </form>
  )
}
