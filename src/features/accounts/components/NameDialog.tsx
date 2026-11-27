import { useState } from 'react'
import type { FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, TextField } from '@/shared/ui'
import { updateName } from '../api'
import type { Account } from '../types'
import Dialog from './Dialog'
import styles from '../accounts.module.css'

/** Changes the displayed first and last name of an account; the email never changes here (MLink-20). */
export default function NameDialog({
  account,
  onClose,
  onSaved,
}: { account: Account; onClose: () => void; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(account.firstName)
  const [lastName, setLastName] = useState(account.lastName)
  const [failure, setFailure] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    const names = { firstName: firstName.trim(), lastName: lastName.trim() }
    if (!names.firstName || !names.lastName) {
      setFailure('Le prénom et le nom sont obligatoires.')
      return
    }
    setFailure(null)
    try {
      setSending(true)
      await updateName(account.id, names)
      onSaved()
    } catch (error) {
      setFailure(messageFor(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog title={`Modifier le nom de ${account.firstName} ${account.lastName}`} onClose={onClose}>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        {failure && <Alert tone="error">{failure}</Alert>}
        <TextField
          label="Prénom"
          maxLength={100}
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <TextField
          label="Nom"
          maxLength={100}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <div className={styles.dialogActions}>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={sending}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
