import type { ReactNode } from 'react'
import styles from './Alert.module.css'

type Props = {
  tone: 'error' | 'success' | 'info'
  children: ReactNode
}

/**
 * A message box. `error` interrupts the screen reader (role alert); `success` and `info` are read when
 * it is free (role status). Show `messageFor(error)` in it, never a raw API body.
 */
export default function Alert({ tone, children }: Props) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`${styles.alert} ${styles[tone]}`}>
      {children}
    </div>
  )
}
