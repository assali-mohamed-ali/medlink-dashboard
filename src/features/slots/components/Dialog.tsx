import { useId, type ReactNode } from 'react'
import { fullDateLabel, timeLabel } from '../week'
import styles from './Dialog.module.css'

/**
 * A modal box over the page (MLink-105, MLink-109): named by its title, Escape closes it unless a request runs. Used
 * by the slot search (book, move) and by my appointments (cancel).
 */
export function Dialog({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  const titleId = useId()
  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose?.()
        }}
      >
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}

/** The buttons at the bottom of a dialog, the main one last. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}

/** The success line of a done screen (booked, moved, cancelled). */
export function DoneLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className={styles.done}>
      {icon} {children}
    </p>
  )
}

/** Where, with whom and when: the same four lines wherever an appointment is shown in a dialog. */
export function Summary({ start, end, who, clinic }: { start: string; end: string; who: string; clinic: string }) {
  return (
    <dl className={styles.summary}>
      <dt>Date</dt>
      <dd>{fullDateLabel(new Date(start))}</dd>
      <dt>Heure</dt>
      <dd>
        {timeLabel(new Date(start))} – {timeLabel(new Date(end))}
      </dd>
      <dt>Praticien</dt>
      <dd>{who}</dd>
      <dt>Clinique</dt>
      <dd>{clinic}</dd>
    </dl>
  )
}

/** A message under a field or in a dialog, announced to screen readers. */
export function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className={styles.error}>
      {message}
    </p>
  )
}
