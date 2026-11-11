import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './StatusPage.module.css'

type Props = {
  title: string
  children: ReactNode
  /** The one way out of the page. */
  action: { label: string; to: string }
  /**
   * Inside a space's layout, which already has the page's main landmark and h1 (e.g. a refused patient record,
   * MLink-31): a plain block with an h2. Alone (a route of its own): a main with an h1.
   */
  inLayout?: boolean
}

/** The frame shared by "Accès refusé", "Page introuvable" and the error page (DRY). */
export default function StatusPage({ title, children, action, inLayout = false }: Props) {
  const Frame = inLayout ? 'div' : 'main'
  const Title = inLayout ? 'h2' : 'h1'
  return (
    <Frame className={styles.page}>
      <div className={styles.card}>
        <Title className={styles.title}>{title}</Title>
        <div className={styles.text}>{children}</div>
        <Link className={styles.action} to={action.to}>
          {action.label}
        </Link>
      </div>
    </Frame>
  )
}
