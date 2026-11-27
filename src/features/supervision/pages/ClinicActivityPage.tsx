import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Card, EmptyState, Select, Skeleton } from '@/shared/ui'
import { fetchPractitionerAgenda, fetchPractitioners } from '../api'
import type { AdminPractitioner, SlotStatus, SupervisedAgenda, SupervisedSlot } from '../types'
import { addDays, longDayLabel, mondayOf, timeLabel, tunisDay, weekDays, weekPeriod, weekTitle } from '../week'
import ClinicCards from '../components/ClinicCards'
import styles from './ClinicActivityPage.module.css'

const STATUS_WORDS: Record<SlotStatus, string> = { OPEN: 'Disponible', BOOKED: 'Réservé', CLOSED: 'Fermé' }

type Loaded<T> = { data: T } | { failure: string } | null

const practitionerLabel = (p: AdminPractitioner) => `${p.lastName} ${p.firstName} · ${p.specialty.name}`

/** One slot, read only: when, where, its status and, on a booked one, the patient's names. */
function SlotLine({ slot }: { slot: SupervisedSlot }) {
  const patient = slot.status === 'BOOKED' ? slot.appointment?.patient : undefined
  return (
    <li className={styles.slot}>
      <span className={styles.time}>
        {timeLabel(slot.startsAt)} – {timeLabel(slot.endsAt)}
      </span>
      <span className={styles.clinic}>{slot.clinic.name}</span>
      <span className={`${styles.status} ${styles[slot.status]}`}>{STATUS_WORDS[slot.status]}</span>
      {patient && (
        <span className={styles.patient}>
          {patient.firstName} {patient.lastName}
        </span>
      )}
    </li>
  )
}

/**
 * "Rendez-vous des cliniques" (MLink-35): staff choose a practitioner and read their week, Monday to Saturday in Tunis
 * time, day by day. Read only, on purpose: no action on a slot and no way to a medical record.
 */
export default function ClinicActivityPage() {
  // Read once: the clock is not called again at each render
  const [thisMonday] = useState(() => mondayOf(tunisDay(new Date())))
  const [practitioners, setPractitioners] = useState<Loaded<AdminPractitioner[]>>(null)
  const [listAttempt, setListAttempt] = useState(0)
  const [chosen, setChosen] = useState('')
  const [monday, setMonday] = useState(thisMonday)
  const [agenda, setAgenda] = useState<Loaded<SupervisedAgenda>>(null)
  const [agendaAttempt, setAgendaAttempt] = useState(0)

  useEffect(() => {
    let current = true
    fetchPractitioners().then(
      (data) => current && setPractitioners({ data }),
      (error) => current && setPractitioners({ failure: messageFor(error) }),
    )
    return () => {
      current = false
    }
  }, [listAttempt])

  useEffect(() => {
    if (!chosen) return
    let current = true
    const { from, to } = weekPeriod(monday)
    fetchPractitionerAgenda(chosen, from, to).then(
      (data) => current && setAgenda({ data }),
      (error) => current && setAgenda({ failure: messageFor(error) }),
    )
    return () => {
      current = false
    }
  }, [chosen, monday, agendaAttempt])

  function choose(id: string) {
    setAgenda(null)
    setChosen(id)
  }

  function moveTo(day: string) {
    setAgenda(null)
    setMonday(day)
  }

  let picker
  if (practitioners === null) {
    picker = <Skeleton lines={1} label="Chargement des praticiens" />
  } else if ('failure' in practitioners) {
    picker = (
      <div className={styles.failure}>
        <Alert tone="error">{practitioners.failure}</Alert>
        <Button
          variant="ghost"
          onClick={() => {
            setPractitioners(null)
            setListAttempt((count) => count + 1)
          }}
        >
          Réessayer
        </Button>
      </div>
    )
  } else {
    picker = (
      <Select label="Praticien" value={chosen} onChange={(event) => choose(event.target.value)}>
        <option value="">Choisir un praticien</option>
        {practitioners.data.map((practitioner) => (
          <option key={practitioner.id} value={practitioner.id}>
            {practitionerLabel(practitioner)}
          </option>
        ))}
      </Select>
    )
  }

  let week
  if (!chosen) {
    week = <p className={styles.muted}>Choisissez un praticien pour voir sa semaine.</p>
  } else if (agenda === null) {
    week = <Skeleton lines={4} label="Chargement de la semaine" />
  } else if ('failure' in agenda) {
    week = (
      <div className={styles.failure}>
        <Alert tone="error">{agenda.failure}</Alert>
        <Button
          variant="ghost"
          onClick={() => {
            setAgenda(null)
            setAgendaAttempt((count) => count + 1)
          }}
        >
          Réessayer
        </Button>
      </div>
    )
  } else if (agenda.data.items.length === 0) {
    week = (
      <EmptyState icon={CalendarDays} title="Aucun créneau cette semaine" compact>
        Ce praticien n’a ouvert aucun créneau sur ces jours.
      </EmptyState>
    )
  } else {
    const items = agenda.data.items
    week = (
      <div className={styles.days}>
        {weekDays(monday).map((day) => {
          const slots = items.filter((slot) => tunisDay(slot.startsAt) === day)
          if (slots.length === 0) return null
          const label = longDayLabel(day)
          return (
            <section key={day} aria-label={label} className={styles.day}>
              <h4 className={styles.dayTitle}>{label}</h4>
              <ul className={styles.slots}>
                {slots.map((slot) => (
                  <SlotLine key={slot.slotId} slot={slot} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <h2>Rendez-vous des cliniques</h2>
      <p className={styles.intro}>
        Le planning de chaque praticien dans les trois cliniques, en lecture seule. Les dossiers médicaux restent
        réservés aux praticiens.
      </p>
      <ClinicCards monday={monday} />
      <Card title="Choix du praticien" headingLevel={3}>
        {picker}
      </Card>
      <Card title={weekTitle(monday)} headingLevel={3}>
        <div className={styles.weekNav}>
          <Button variant="secondary" onClick={() => moveTo(addDays(monday, -7))}>
            Semaine précédente
          </Button>
          <Button variant="ghost" onClick={() => moveTo(thisMonday)} disabled={monday === thisMonday}>
            Cette semaine
          </Button>
          <Button variant="secondary" onClick={() => moveTo(addDays(monday, 7))}>
            Semaine suivante
          </Button>
        </div>
        {week}
      </Card>
    </>
  )
}
