import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, RadioGroup, TextField } from '@/shared/ui'
import { createAccount } from '../api'
import type { Account, NewAccount, PractitionerProfile, StaffRole } from '../types'
import Dialog from './Dialog'
import ProfileFields from './ProfileFields'
import { STAFF_ROLE_OPTIONS } from './roleLabels'
import { useAccountForm } from './useAccountForm'
import styles from '../accounts.module.css'

const FIELDS = ['email', 'firstName', 'lastName', 'role', 'specialtyId', 'clinicIds'] as const

type Props = { onCreated: (account: Account) => void; onClose: () => void }

/**
 * "Nouveau compte" (20.5): e-mail, prénom, nom and a staff role; a practitioner also gets a specialty and clinics.
 * No password field: the new person chooses theirs from the activation mail (20.3).
 */
export default function CreateAccountDialog({ onCreated, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<StaffRole | ''>('')
  const [profile, setProfile] = useState<PractitionerProfile>({ specialtyId: '', clinicIds: [] })
  const { errors, failure, sending, send } = useAccountForm(FIELDS)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const account = { email, firstName, lastName, role, ...(role === 'PRACTITIONER' ? profile : {}) } as NewAccount
    let created: Account | null = null
    const ok = await send(
      async () => {
        created = await createAccount(account)
      },
      (error) => (error.code === 'EMAIL_TAKEN' ? { email: 'Un compte existe déjà avec cet e-mail' } : null),
    )
    if (ok && created) onCreated(created)
  }

  return (
    <Dialog title="Nouveau compte" onClose={onClose}>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        {failure && <Alert tone="error">{failure}</Alert>}
        <TextField
          label="Adresse e-mail"
          type="email"
          autoComplete="off"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className={styles.twoColumns}>
          <TextField label="Prénom" value={firstName} error={errors.firstName} onChange={(event) => setFirstName(event.target.value)} />
          <TextField label="Nom" value={lastName} error={errors.lastName} onChange={(event) => setLastName(event.target.value)} />
        </div>
        <RadioGroup
          legend="Rôle"
          name="new-account-role"
          options={STAFF_ROLE_OPTIONS}
          value={role}
          error={errors.role}
          onChange={(value) => setRole(value as StaffRole)}
        />
        {role === 'PRACTITIONER' && <ProfileFields value={profile} onChange={setProfile} errors={errors} />}
        <p className={styles.muted}>La personne recevra un e-mail pour activer son compte et choisir son mot de passe.</p>
        <div className={styles.dialogActions}>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={sending}>
            Créer le compte
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
