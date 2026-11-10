import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Skeleton } from '@/shared/ui'
import { fetchAgenda } from '../api'
import { toneOf } from '../clinicTones'
import ClinicFilter from '../components/ClinicFilter'
import MonthCalendar from '../components/MonthCalendar'
import Occupancy from '../components/Occupancy'
import WeekTable from '../components/WeekTable'
import type { Agenda } from '../types'
import { addDays, isoWeek, mondayOf, monthOf, tunisDay, weekPeriod, weekTitle } from '../week'
import styles from '../agenda.module.css'

type Load = { status: 'loading' } | { status: 'ready'; agenda: Agenda } | { status: 'error'; message: string }

/** What the last answer was for: a week and an attempt. Another key means that answer is not the current one. */
type Answer = { key: string; load: Load }

/**
 * MLink-26 (26.7): the practitioner's week, Monday to Saturday, the three clinics in one view, after the Stitch
 * design. Only what the API knows is shown: no consultation type, no fake data.
 */
export default function AgendaPage() {
  const titleId = useId()
  // "Today" is read once, when the page opens
  const [today] = useState(() => tunisDay(new Date()))
  const thisMonday = mondayOf(today)
  const [monday, setMonday] = useState(thisMonday)
  const [month, setMonth] = useState(monthOf(today))
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())

  const key = `${monday}#${attempt}`
  // Loading until the answer for this week (and this attempt) arrives: nothing to reset when the week changes
  const load: Load = answer?.key === key ? answer.load : { status: 'loading' }
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const clinics = load.status === 'ready' ? load.agenda.clinics : null
  const tones = useMemo(() => toneOf(clinics ?? []), [clinics])

  useEffect(() => {
    let current = true
    const { from, to } = weekPeriod(monday)
    fetchAgenda(from, to).then(
      (agenda) => current && setAnswer({ key, load: { status: 'ready', agenda } }),
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

  const title = weekTitle(monday)

  return (
    <section aria-labelledby={titleId} className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            Agenda praticien — Consultations multi-cliniques
          </h2>
          <p className={styles.subtitle}>Supervision hebdomadaire de vos consultations réparties sur le réseau MedLink</p>
        </div>
      </header>

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
            <WeekTable title={title} monday={monday} today={today} agenda={load.agenda} tones={tones} hidden={hidden} />
          )}
        </div>
      </div>
    </section>
  )
}
