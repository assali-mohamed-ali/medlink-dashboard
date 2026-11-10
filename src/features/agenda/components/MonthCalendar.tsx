import { useId } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, dayOfMonth, longDayLabel, mondayOf, monthGrid, monthOf, monthTitle } from '../week'
import styles from '../agenda.module.css'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

type Props = {
  /** The first day of the month shown. */
  month: string
  /** The Monday of the week shown in the table: its days are highlighted. */
  monday: string
  today: string
  onMonth: (month: string) => void
  onDay: (day: string) => void
}

/** The month at a glance (Stitch design): a click on a day opens its week. */
export default function MonthCalendar({ month, monday, today, onMonth, onDay }: Props) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 id={titleId} className={styles.panelTitle}>
          {monthTitle(month)}
        </h3>
        <div className={styles.iconButtons}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Mois précédent"
            onClick={() => onMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Mois suivant"
            onClick={() => onMonth(addMonths(month, 1))}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.month}>
        {WEEKDAYS.map((letter, index) => (
          <span key={index} className={styles.monthWeekday} aria-hidden="true">
            {letter}
          </span>
        ))}
        {monthGrid(month).map((day) => (
          <button
            key={day}
            type="button"
            className={styles.monthDay}
            data-outside={monthOf(day) !== monthOf(month) || undefined}
            data-week={mondayOf(day) === monday || undefined}
            aria-current={day === today ? 'date' : undefined}
            aria-label={longDayLabel(day)}
            onClick={() => onDay(day)}
          >
            {dayOfMonth(day)}
          </button>
        ))}
      </div>
    </section>
  )
}
