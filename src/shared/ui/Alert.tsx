import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import styles from './Alert.module.css'

type Tone = 'error' | 'warning' | 'success' | 'info'

type Props = {
  tone: Tone
  /** A short first line in bold, read before the message. */
  title?: ReactNode
  children: ReactNode
}

// The icon repeats the tone for the eye; the words carry the meaning, so screen readers skip it
const ICONS = { error: CircleAlert, warning: TriangleAlert, success: CircleCheck, info: Info } as const

/**
 * A message box. `error` interrupts the screen reader (role alert); `warning`, `success` and `info` are read when
 * it is free (role status). Show `messageFor(error)` in it, never a raw API body.
 */
export default function Alert({ tone, title, children }: Props) {
  const Icon = ICONS[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`${styles.alert} ${styles[tone]}`}>
      <Icon className={styles.icon} size={20} aria-hidden="true" />
      <div className={styles.body}>
        {title && <strong className={styles.title}>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  )
}
