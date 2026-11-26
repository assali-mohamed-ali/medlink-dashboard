import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui'
import Dialog from './Dialog'
import styles from '../accounts.module.css'

type Props = {
  title: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
  children: ReactNode
}

/** "Are you sure?" before an action on an account. The focus starts on "Annuler", the safe choice. */
export default function ConfirmDialog({ title, confirmLabel, danger = false, onConfirm, onClose, children }: Props) {
  const [busy, setBusy] = useState(false)

  async function confirm() {
    if (busy) return
    setBusy(true)
    await onConfirm()
  }

  return (
    <Dialog title={title} alert onClose={onClose}>
      <div className={styles.dialogText}>{children}</div>
      <div className={styles.dialogActions}>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => void confirm()} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
