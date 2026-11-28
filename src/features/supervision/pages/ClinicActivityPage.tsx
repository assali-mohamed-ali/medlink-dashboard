import { Link } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { useEffect, useId, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, EmptyState, Select, Skeleton, TextField } from '@/shared/ui'
import { fetchPractitionerAgenda, fetchPractitioners } from '../api'
import type { AdminPractitioner, ClinicRef, SlotStatus, SupervisedAgenda, SupervisedSlot } from '../types'
import {
  addDays,
  dayOfMonth,
  isoWeek,
  longDayLabel,
  mondayOf,
  shortWeekday,
  timeLabel,
  tunisDay,
  weekDays,
  weekPeriod,
  weekTitle,
} from '../week'
import ClinicCards from '../components/ClinicCards'
import styles from './ClinicActivityPage.module.css'

const STATUS_WORDS: Record<SlotStatus, string> = { OPEN: 'libre', BOOKED: 'réservé', CLOSED: 'fermé' }

type Loaded<T> = { data: T } | { failure: string } | null

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`
const initials = (p: { firstName: string; lastName: string }) =>
  `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase()

/** "Clinique MedLink Sousse" → "Sousse". */
const shortName = (clinic: ClinicRef) => clinic.name.replace(/^Clinique\s+MedLink\s+/i, '')

/** Lower case, no accents: "Pédiatrie" and "pediatrie" match. */
const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** One pastel tone per clinic, in the order of their names (as on the practitioner's agenda). */
function tonesOf(clinics: readonly ClinicRef[]) {
  const unique = [...new Map(clinics.map((clinic) => [clinic.id, clinic])).values()]
  const sorted = unique.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return new Map(sorted.map((clinic, index) => [clinic.id, (index % 3) + 1]))
}

function plural(count: number, one: string, many: string) {
  return count > 1 ? many : one
}

/** One slot, read only: its time, and on a booked one the patient ("Amel B."), the whole name read out. */
function SlotCard({ slot, tone }: { slot: SupervisedSlot; tone: number }) {
  const patient = slot.status === 'BOOKED' ? slot.appointment?.patient : undefined
  const time = `${timeLabel(slot.startsAt)} – ${timeLabel(slot.endsAt)}`
  const label = [time, slot.clinic.name, STATUS_WORDS[slot.status], patient && fullName(patient)].filter(Boolean).join(', ')
  return (
    <li className={styles.slot} data-status={slot.status} data-tone={tone} aria-label={label}>
      <b>{timeLabel(slot.startsAt)}</b>
      <span className={styles.slotWhat}>
        {patient ? `${patient.firstName} ${patient.lastName.charAt(0)}.` : slot.status === 'OPEN' ? 'Libre' : 'Fermé'}
      </span>
      <small>{shortName(slot.clinic)}</small>
    </li>
  )
}

/**
 * "Rendez-vous des cliniques" (MLink-35), after the Stitch design of the staff space: the practitioners as cards with a
 * search, then the chosen one's week, Monday to Saturday in Tunis time, slots tinted by clinic. Read only, on purpose:
 * no action on a slot and no way to a medical record.
 */
export default function ClinicActivityPage() {
  const titleId = useId()
  const searchId = useId()
  const chosenId = useId()
  // Read once: the clock is not called again at each render
  const [today] = useState(() => tunisDay(new Date()))
  const thisMonday = mondayOf(today)
  const [practitioners, setPractitioners] = useState<Loaded<AdminPractitioner[]>>(null)
  const [listAttempt, setListAttempt] = useState(0)
  const [search, setSearch] = useState('')
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
    if (id === chosen) return
    setAgenda(null)
    setChosen(id)
  }

  function moveTo(day: string) {
    if (day === monday) return
    setAgenda(null)
    setMonday(day)
  }

  const [clinicId, setClinicId] = useState('')
  const list = practitioners && 'data' in practitioners ? practitioners.data : null
  const clinicChoices = [...new Map((list ?? []).flatMap(person => person.clinics).map(clinic => [clinic.id, clinic])).values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const wanted = normalize(search.trim())
  const shown = list?.filter((p) => (!clinicId || p.clinics.some(clinic => clinic.id === clinicId)) && (!wanted || normalize(`${fullName(p)} ${p.lastName} ${p.specialty.name}`).includes(wanted)))
  const practitioner = list?.find((p) => p.id === chosen)
  // One tone per clinic for the whole page (cards, slots, legend): from every practitioner's clinics
  const networkTones = tonesOf(list?.flatMap((p) => p.clinics) ?? [])

  let picker
  if (practitioners === null) {
    picker = <Skeleton lines={3} label="Chargement des praticiens" />
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
    const tones = networkTones
    picker = (
      <>
        <label htmlFor={searchId} className="visually-hidden">
          Rechercher un praticien
        </label>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            placeholder="Nom ou spécialité"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {shown && shown.length === 0 && <p className={styles.muted}>Aucun praticien ne correspond.</p>}
        <ul className={styles.pros} aria-label="Praticiens">
          {shown?.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={styles.pro}
                aria-pressed={p.id === chosen}
                aria-label={`Dr ${fullName(p)}, ${p.specialty.name}`}
                onClick={() => choose(p.id)}
              >
                <span className={styles.initials} aria-hidden="true">
                  {initials(p)}
                </span>
                <span className={styles.proText}>
                  <b>Dr {fullName(p)}</b>
                  <small>{p.specialty.name}</small>
                  <span className={styles.chips}>
                    {p.clinics.map((clinic) => (
                      <span key={clinic.id} className={styles.chip} data-tone={tones.get(clinic.id)}>
                        {shortName(clinic)}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  }

  let week
  if (!chosen) {
    week = (
      <EmptyState icon={CalendarDays} title="Aucun praticien choisi" compact>
        Choisissez un praticien pour voir sa semaine.
      </EmptyState>
    )
  } else if (agenda === null) {
    week = <Skeleton lines={6} label="Chargement de la semaine" />
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
  } else {
    const items = agenda.data.items.filter(slot => !clinicId || slot.clinic.id === clinicId)
    const tones = networkTones.size > 0 ? networkTones : tonesOf(agenda.data.clinics)
    const count = (status: SlotStatus) => items.filter((slot) => slot.status === status).length
    const booked = count('BOOKED')
    const open = count('OPEN')
    const closed = count('CLOSED')
    week = (
      <>
        {practitioner && (
          <section className={styles.chosen} aria-labelledby={chosenId}>
            <span className={styles.initials} data-size="lg" aria-hidden="true">
              {initials(practitioner)}
            </span>
            <div className={styles.chosenText}>
              <h3 id={chosenId}>Dr {fullName(practitioner)}</h3>
              <span>
                {practitioner.specialty.name} · {practitioner.clinics.map(shortName).join(', ')}
              </span>
            </div>
            <ul className={styles.counts} aria-label="La semaine en chiffres">
              <li>
                <b>{booked}</b>
                <small>{plural(booked, 'réservé', 'réservés')}</small>
              </li>
              <li>
                <b>{open}</b>
                <small>{plural(open, 'libre', 'libres')}</small>
              </li>
              <li>
                <b>{closed}</b>
                <small>{plural(closed, 'fermé', 'fermés')}</small>
              </li>
            </ul>
          </section>
        )}
        {items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aucun créneau cette semaine" compact>
            Ce praticien n’a ouvert aucun créneau sur ces jours.
          </EmptyState>
        ) : (
          <div className={styles.grid}>
            {weekDays(monday).map((day) => {
              const slots = items.filter((slot) => tunisDay(slot.startsAt) === day)
              return (
                <section
                  key={day}
                  aria-label={longDayLabel(day)}
                  aria-current={day === today ? 'date' : undefined}
                  className={styles.day}
                >
                  <h4 className={styles.dayHead} aria-hidden="true">
                    <small>{shortWeekday(day)}</small>
                    <b>{dayOfMonth(day)}</b>
                  </h4>
                  {slots.length === 0 ? (
                    <p className={styles.none}>Aucun créneau</p>
                  ) : (
                    <ul className={styles.slots}>
                      {slots.map((slot) => (
                        <SlotCard key={slot.slotId} slot={slot} tone={tones.get(slot.clinic.id) ?? 1} />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
        {items.length > 0 && (
          <ul className={styles.legend} aria-label="Légende">
            {[...agenda.data.clinics]
              .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
              .map((clinic) => (
                <li key={clinic.id}>
                  <span className={styles.swatch} data-tone={tones.get(clinic.id)} aria-hidden="true" />
                  {shortName(clinic)}
                </li>
              ))}
            <li>
              <span className={styles.swatch} data-status="OPEN" aria-hidden="true" />
              Libre
            </li>
            <li>
              <span className={styles.swatch} data-status="CLOSED" aria-hidden="true" />
              Fermé
            </li>
          </ul>
        )}
      </>
    )
  }

  return (
    <section className={styles.page} data-width="wide" aria-labelledby={titleId}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <span className={styles.liveDot} aria-hidden="true" />
            Espace administratif
          </p>
          <h2 id={titleId} className={styles.title}>
            Rendez-vous des cliniques
          </h2>
          <p className={styles.intro}>
            Le planning de chaque praticien dans les trois cliniques. Les dossiers médicaux restent réservés aux
            praticiens.
          </p>
        </div>
        <div className={styles.headerActions}><span className={styles.readOnly}><Lock size={16} aria-hidden="true" /> Lecture seule</span><Link className={styles.bookingLink} to={paths.staff.booking}>Réserver pour un patient</Link></div>
      </header>

      <div className={styles.periodControls}>
        <TextField label="Semaine contenant le" type="date" value={monday} onChange={event => { if (event.target.value) moveTo(mondayOf(event.target.value)) }} />
        <Select label="Clinique" value={clinicId} onChange={event => { const id = event.target.value; setClinicId(id); if (id && practitioner && !practitioner.clinics.some(clinic => clinic.id === id)) choose('') }}><option value="">Toutes les cliniques</option>{clinicChoices.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</Select>
        <Button variant="secondary" onClick={() => { setClinicId(''); moveTo(thisMonday) }}>Réinitialiser</Button>
      </div>
      <ClinicCards monday={monday} clinicId={clinicId} />

      <div className={styles.layout}>
        <aside className={styles.card} aria-label="Choix du praticien">
          <h3 className={styles.cardTitle}>
            Praticiens{list && <span className={styles.total}> · {list.length}</span>}
          </h3>
          {picker}
        </aside>

        <div className={styles.card}>
          <div className={styles.weekBar}>
            <div className={styles.weekNav}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Semaine précédente"
                onClick={() => moveTo(addDays(monday, -7))}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Semaine suivante"
                onClick={() => moveTo(addDays(monday, 7))}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.weekText}>
              <b>{weekTitle(monday)}</b>
              <small>Semaine {isoWeek(monday)} · heure de Tunis</small>
            </div>
            <Button variant="secondary" size="sm" onClick={() => moveTo(thisMonday)} disabled={monday === thisMonday}>
              Cette semaine
            </Button>
          </div>
          {week}
        </div>
      </div>
    </section>
  )
}
