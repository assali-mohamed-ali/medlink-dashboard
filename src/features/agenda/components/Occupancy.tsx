import { useId } from 'react'
import type { AgendaItem } from '../types'
import styles from '../agenda.module.css'

/** "Taux d'occupation hebdo" (Stitch design): booked slots among the bookable ones (open or booked) of the week. */
export default function Occupancy({ items }: { items: readonly AgendaItem[] }) {
  const titleId = useId()
  const booked = items.filter((item) => item.status === 'BOOKED').length
  const open = items.filter((item) => item.status === 'OPEN').length
  const rate = booked + open === 0 ? 0 : Math.round((booked / (booked + open)) * 100)

  return (
    <section aria-labelledby={titleId} className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 id={titleId} className={styles.occupancyTitle}>
          Taux d’occupation hebdo
        </h3>
        <span className={styles.rate}>{rate} %</span>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <span style={{ width: `${rate}%` }} />
      </div>
      <p className={styles.occupancyCounts}>
        <span>
          {booked} rendez-vous fixé{booked > 1 ? 's' : ''}
        </span>
        <span>
          {open} disponible{open > 1 ? 's' : ''}
        </span>
      </p>
    </section>
  )
}
