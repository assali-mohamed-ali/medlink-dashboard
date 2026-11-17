import { useEffect, useId, useState } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Checkbox, Select } from '@/shared/ui'
import { fetchProfileChoices } from '../api'
import type { PractitionerProfile, ProfileChoices } from '../types'
import styles from '../accounts.module.css'

type Props = {
  value: PractitionerProfile
  onChange: (value: PractitionerProfile) => void
  errors: { specialtyId?: string; clinicIds?: string }
}

/** A practitioner's specialty and clinics (the API refuses a practitioner without them), from the API's lists. */
export default function ProfileFields({ value, onChange, errors }: Props) {
  const clinicErrorId = useId()
  const [choices, setChoices] = useState<ProfileChoices | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    fetchProfileChoices().then(
      (loaded) => current && setChoices(loaded),
      (error) => current && setFailure(messageFor(error)),
    )
    return () => {
      current = false
    }
  }, [])

  if (failure) {
    return (
      <p className={styles.fieldError} role="alert">
        Les spécialités et les cliniques n’ont pas pu être chargées. {failure}
      </p>
    )
  }
  if (!choices) return <p className={styles.muted}>Chargement des spécialités et des cliniques…</p>

  function toggle(clinicId: string, checked: boolean) {
    const clinicIds = checked ? [...value.clinicIds, clinicId] : value.clinicIds.filter((id) => id !== clinicId)
    // Kept in the order of the list, whatever the order of the clicks
    onChange({ ...value, clinicIds: choices!.clinics.map((c) => c.id).filter((id) => clinicIds.includes(id)) })
  }

  return (
    <div className={styles.profile}>
      <Select
        label="Spécialité"
        value={value.specialtyId}
        error={errors.specialtyId}
        onChange={(event) => onChange({ ...value, specialtyId: event.target.value })}
      >
        <option value="">Choisir une spécialité</option>
        {choices.specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.id}>
            {specialty.name}
          </option>
        ))}
      </Select>
      <fieldset className={styles.clinics} aria-describedby={errors.clinicIds ? clinicErrorId : undefined}>
        <legend className={styles.legend}>Cliniques</legend>
        {choices.clinics.map((clinic) => (
          <Checkbox
            key={clinic.id}
            label={clinic.name}
            checked={value.clinicIds.includes(clinic.id)}
            onChange={(event) => toggle(clinic.id, event.target.checked)}
          />
        ))}
        {errors.clinicIds && (
          <p id={clinicErrorId} className={styles.fieldError} role="alert">
            {errors.clinicIds}
          </p>
        )}
      </fieldset>
    </div>
  )
}
