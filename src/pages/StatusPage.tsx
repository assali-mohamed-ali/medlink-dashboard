import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './StatusPage.module.css'

type Props = {
  title: string
  children: ReactNode
  /** The one way out of the page. */
  action: { label: string; to: string }
}

/** The frame shared by "Accès refusé", "Page introuvable" and the error page (DRY). */
export default function StatusPage({ title, children, action }: Props) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.text}>{children}</div>
        <Link className={styles.action} to={action.to}>
          {action.label}
        </Link>
      </div>
    </main>
  )
}
