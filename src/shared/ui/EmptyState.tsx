import type { ComponentType, ReactNode } from 'react'
import styles from './EmptyState.module.css'

type Props = {
  /** A lucide icon (decorative). */
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>
  title: ReactNode
  /** One sentence: what will be here, or what to do. */
  children: ReactNode
  /** At most one action. */
  action?: ReactNode
  headingLevel?: 2 | 3 | 4
  /** Inside a Card: no extra padding of its own. */
  compact?: boolean
}

/** What a list or a page shows before it has content: honest ("Bientôt disponible"), never fake data. */
export default function EmptyState({ icon: Icon, title, children, action, headingLevel = 3, compact = false }: Props) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className={compact ? `${styles.empty} ${styles.compact}` : styles.empty}>
      <span className={styles.icon}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.text}>{children}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
