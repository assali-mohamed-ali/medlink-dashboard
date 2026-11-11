import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/features/auth'
import UserAvatar from '@/shared/components/UserAvatar'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Skeleton } from '@/shared/ui'
import { changeSlotStatus, fetchAgenda } from '../api'
import { shortName, sortedClinics, toneOf } from '../clinicTones'
import ClinicFilter from '../components/ClinicFilter'
import MonthCalendar from '../components/MonthCalendar'
import Occupancy from '../components/Occupancy'
import OpenSlotForm from '../components/OpenSlotForm'
import WeekTable from '../components/WeekTable'
import type { Agenda, AgendaItem, ClinicRef } from '../types'
import { addDays, isoWeek, longDayLabel, mondayOf, monthOf, timeLabel, tunisDay, weekPeriod, weekTitle } from '../week'
import styles from '../agenda.module.css'

type Load = { status: 'loading' } | { status: 'ready'; agenda: Agenda } | { status: 'error'; message: string }

/** What the last answer was for: a week and an attempt. Another key means that answer is not the current one. */
type Answer = { key: string; load: Load }

/** The last thing done on a slot, said under the header. */
type Notice = { tone: 'success' | 'error'; text: string }

/** "vendredi 13 novembre, 09:00 – 09:30" */
function when(item: AgendaItem) {
  return `${longDayLabel(tunisDay(item.startsAt))}, ${timeLabel(item.startsAt)} – ${timeLabel(item.endsAt)}`
}

/** A change refused because of the slot itself: say it in French, then read the agenda again (it changed). */
function changeFailure(error: unknown): { text: string; reload: boolean } {
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return { text: 'Ce créneau ne fait pas partie de votre agenda.', reload: true }
  }
  return { text: messageFor(error), reload: error instanceof ApiError && error.status === 409 }
}

/**
 * MLink-26 (26.7): the practitioner's week, Monday to Saturday, the three clinics in one view, after the Stitch
 * design. Only what the API knows is shown: no consultation type, no fake data.
 */
export default function AgendaPage() {
  const titleId = useId()
  const { user } = useAuth()
  // "Today" is read once, when the page opens
  const [now] = useState(() => Date.now())
  const today = tunisDay(new Date(now))
  const thisMonday = mondayOf(today)
  const [monday, setMonday] = useState(thisMonday)
  const [month, setMonth] = useState(monthOf(today))
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const formId = useId()
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const pendingRef = useRef<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  // The practitioner's clinics, kept while another week loads (the form stays open meanwhile)
  const [knownClinics, setKnownClinics] = useState<readonly ClinicRef[] | null>(null)

  const key = `${monday}#${attempt}`
  // Loading until the answer for this week (and this attempt) arrives: nothing to reset when the week changes
  // After a change, the week already shown stays on screen while it is read again (no flash, no lost place)
  const sameWeek = answer?.key.startsWith(`${monday}#`) && answer.load.status === 'ready'
  const load: Load = answer?.key === key || sameWeek ? answer!.load : { status: 'loading' }
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const clinics = load.status === 'ready' ? load.agenda.clinics : null
  const tones = useMemo(() => toneOf(clinics ?? []), [clinics])

  useEffect(() => {
    let current = true
    const { from, to } = weekPeriod(monday)
    fetchAgenda(from, to).then(
      (agenda) => {
        if (!current) return
        setAnswer({ key, load: { status: 'ready', agenda } })
        setKnownClinics(agenda.clinics)
      },
      (error) => current && setAnswer({ key, load: { status: 'error', message: messageFor(error) } }),
    )
    return () => {
      current = false
    }
  }, [monday, key])

  /** Shows the week of `day`; the month calendar follows. */
  function showWeek(day: string) {
    const next = mondayOf(day)
    setMonday(next)
    setMonth(monthOf(day))
  }

  function toggle(clinicId: string) {
    setHidden((before) => {
      const next = new Set(before)
      if (next.has(clinicId)) next.delete(clinicId)
      else next.add(clinicId)
      return next
    })
  }

  function closeForm() {
    setFormOpen(false)
    addButton.current?.focus()
  }

  function opened(item: AgendaItem) {
    setNotice({ tone: 'success', text: `Créneau ouvert : ${when(item)}, ${item.clinic.name}.` })
    closeForm()
    showWeek(tunisDay(item.startsAt))
    reload()
  }

  /** The slot in the way of a new one may be hidden (filter, other week): show its clinic and its week. */
  function showConflict(details: unknown) {
    if (!details || typeof details !== 'object') return
    const { conflictClinic, conflictStartsAt } = details as Record<string, unknown>
    const clinic = knownClinics?.find((known) => known.name === conflictClinic)
    if (clinic) {
      setHidden((before) => {
        const next = new Set(before)
        next.delete(clinic.id)
        return next
      })
    }
    if (typeof conflictStartsAt === 'string' && !Number.isNaN(Date.parse(conflictStartsAt))) {
      showWeek(tunisDay(conflictStartsAt))
    }
  }

  /** Closes or reopens a slot; one request at a time, then the agenda is read again. */
  async function change(item: AgendaItem, status: 'OPEN' | 'CLOSED') {
    if (pendingRef.current) return
    pendingRef.current = item.slotId
    setPending(item.slotId)
    setNotice(null)
    try {
      await changeSlotStatus(item.slotId, status)
      setNotice({ tone: 'success', text: `Créneau ${status === 'CLOSED' ? 'fermé' : 'rouvert'} : ${when(item)}.` })
      reload()
    } catch (error) {
      const failure = changeFailure(error)
      setNotice({ tone: 'error', text: failure.text })
      if (failure.reload) reload()
    } finally {
      pendingRef.current = null
      setPending(null)
    }
  }

  const title = weekTitle(monday)

  return (
    <section aria-labelledby={titleId} className={styles.page} data-width="wide">
      <header className={styles.header}>
        <div>
          {clinics && clinics.length > 0 && (
            <p className={styles.eyebrow}>
              <span className={styles.liveDot} aria-hidden="true" />
              Vos cliniques : {sortedClinics(clinics).map((clinic) => shortName(clinic.name)).join(' • ')} ({clinics.length}{' '}
              site{clinics.length > 1 ? 's' : ''})
            </p>
          )}
          <h2 id={titleId} className={styles.title}>
            Agenda praticien — Consultations multi-cliniques
          </h2>
          <p className={styles.subtitle}>Supervision hebdomadaire de vos consultations réparties sur le réseau MedLink</p>
        </div>
        <div className={styles.headerSide}>
          {user && (
            <div className={styles.identity}>
              <UserAvatar firstName={user.firstName} lastName={user.lastName} />
              <span>
                <span className={styles.identityName}>
                  {user.firstName} {user.lastName}
                </span>
                <span className={styles.identityRole}>Praticien</span>
              </span>
            </div>
          )}
          <button
            ref={addButton}
            type="button"
            className={styles.action}
            aria-expanded={formOpen}
            aria-controls={formOpen ? formId : undefined}
            disabled={!knownClinics || knownClinics.length === 0}
            onClick={() => {
              setNotice(null)
              setFormOpen((open) => !open)
            }}
          >
            <CalendarPlus size={18} aria-hidden="true" />+ Ajouter un créneau
          </button>
        </div>
      </header>

      {formOpen && knownClinics && (
        <OpenSlotForm
          id={formId}
          clinics={knownClinics}
          today={today}
          onOpened={opened}
          onCancel={closeForm}
          onConflict={showConflict}
        />
      )}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className={styles.layout}>
        <aside className={styles.side}>
          <MonthCalendar month={month} monday={monday} today={today} onMonth={setMonth} onDay={showWeek} />
          {load.status === 'ready' && (
            <>
              <ClinicFilter
                agenda={load.agenda}
                tones={tones}
                hidden={hidden}
                onToggle={toggle}
                onShowAll={() => setHidden(new Set())}
              />
              <Occupancy items={load.agenda.items} />
            </>
          )}
        </aside>

        <div className={styles.week}>
          <div className={styles.weekBar}>
            <div className={styles.weekNav}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Semaine précédente"
                onClick={() => showWeek(addDays(monday, -7))}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Semaine suivante"
                onClick={() => showWeek(addDays(monday, 7))}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
              <div>
                <h3 className={styles.weekTitle}>{title}</h3>
                <p className={styles.weekSubtitle}>Semaine {isoWeek(monday)} • Fuseau GMT+1 (Tunis)</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => showWeek(today)} disabled={monday === thisMonday}>
              Aujourd’hui
            </Button>
          </div>

          {load.status === 'loading' && <Skeleton lines={6} label="Chargement de l’agenda…" />}
          {load.status === 'error' && (
            <div className={styles.error}>
              <Alert tone="error">{load.message}</Alert>
              <Button variant="secondary" onClick={reload}>
                Réessayer
              </Button>
            </div>
          )}
          {load.status === 'ready' && (
            <WeekTable
              title={title}
              monday={monday}
              today={today}
              agenda={load.agenda}
              tones={tones}
              hidden={hidden}
              now={now}
              pending={pending}
              onChange={change}
            />
          )}
        </div>
      </div>
    </section>
  )
}
