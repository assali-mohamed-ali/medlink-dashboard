import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, RadioGroup } from '@/shared/ui'
import { changeRole } from '../api'
import type { Account, PractitionerProfile, RoleChange, StaffRole } from '../types'
import Dialog from './Dialog'
import ProfileFields from './ProfileFields'
import { STAFF_ROLE_OPTIONS } from './roleLabels'
import { useAccountForm } from './useAccountForm'
import styles from '../accounts.module.css'

const FIELDS = ['role', 'specialtyId', 'clinicIds'] as const

type Props = { account: Account; onChanged: (role: StaffRole) => void; onClose: () => void }

/** Changes the role of a staff account; becoming a practitioner also needs a specialty and clinics. */
export default function RoleDialog({ account, onChanged, onClose }: Props) {
  const name = `${account.firstName} ${account.lastName}`
  const current = account.role === 'PRACTITIONER' || account.role === 'ADMINISTRATIVE_STAFF' ? account.role : ''
  const [role, setRole] = useState<StaffRole | ''>(current)
  const [profile, setProfile] = useState<PractitionerProfile>({ specialtyId: '', clinicIds: [] })
  const { errors, failure, sending, send } = useAccountForm(FIELDS)
  // A practitioner keeps their profile; only someone becoming one gives a specialty and clinics
  const needsProfile = role === 'PRACTITIONER' && account.role !== 'PRACTITIONER'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const change = { role, ...(needsProfile ? profile : {}) } as RoleChange
    if (await send(() => changeRole(account.id, change)) && role) onChanged(role)
  }

  return (
    <Dialog title={`Changer le rôle de ${name}`} onClose={onClose}>
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        {failure && <Alert tone="error">{failure}</Alert>}
        <RadioGroup
          legend="Rôle"
          name={`role-${account.id}`}
          options={STAFF_ROLE_OPTIONS}
          value={role}
          error={errors.role}
          onChange={(value) => setRole(value as StaffRole)}
        />
        {needsProfile && <ProfileFields value={profile} onChange={setProfile} errors={errors} />}
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
