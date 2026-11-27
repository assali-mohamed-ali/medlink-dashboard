import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { messageFor } from '@/shared/api/errors'
import { Button, Card } from '@/shared/ui'
import { fetchClinicAssignments, fetchProfileChoices, saveClinicAssignment, type ClinicAssignment } from '../api'
import type { ProfileChoices } from '../types'

export default function ClinicAssignmentsPage() {
  const [data, setData] = useState<{ practitioners: ClinicAssignment[]; choices: ProfileChoices }>()
  const [selected, setSelected] = useState('')
  const [review, setReview] = useState<string[]>()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    Promise.all([fetchClinicAssignments(), fetchProfileChoices()]).then(
      ([practitioners, choices]) => { if (current) setData({ practitioners, choices }) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  const practitioner = data?.practitioners.find((row) => row.id === selected)

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clinicIds = new FormData(event.currentTarget).getAll('clinic').map(String)
    if (clinicIds.length === 0) {
      setError('Sélectionnez au moins une clinique.')
      return
    }
    setError('')
    setSaved(false)
    setReview(clinicIds)
  }

  async function save() {
    if (!practitioner || !review || busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await saveClinicAssignment(practitioner.id, review)
      setData((value) => value && {
        ...value, practitioners: value.practitioners.map((row) => row.id === updated.id ? updated : row),
      })
      setReview(undefined)
      setSaved(true)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Affectations aux cliniques">
      <p>Les créneaux futurs ouverts ou réservés bloquent un retrait. Fermez les créneaux libres et proposez les transferts nécessaires.</p>
      <Link to={paths.staff.reassignments}>Gérer les réaffectations de rendez-vous</Link>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Affectations enregistrées.</p>}
      {!data && !error && <p role="status">Chargement des affectations…</p>}
      {data && (data.practitioners.length ? (
        <>
          <label>Praticien <select value={selected} disabled={busy} onChange={(event) => {
            setSelected(event.target.value)
            setReview(undefined)
            setSaved(false)
            setError('')
          }}>
            <option value="">Choisir un praticien</option>
            {data.practitioners.map((row) => <option key={row.id} value={row.id}>{row.firstName} {row.lastName}</option>)}
          </select></label>
          {practitioner && (review ? (
            <div>
              <p>Cliniques après modification · {data.choices.clinics.filter((clinic) => review.includes(clinic.id)).map((clinic) => clinic.name).join(', ')}</p>
              <Button disabled={busy} onClick={() => void save()}>Confirmer les affectations</Button>
              <Button disabled={busy} onClick={() => setReview(undefined)}>Annuler</Button>
            </div>
          ) : (
            <form key={practitioner.id} onSubmit={prepare}>
              <fieldset>
                <legend>Cliniques attribuées</legend>
                {data.choices.clinics.map((clinic) => (
                  <label className="block" key={clinic.id}>
                    <input type="checkbox" name="clinic" value={clinic.id}
                      defaultChecked={practitioner.clinics.some((assignment) => assignment.id === clinic.id)} />
                    {' '}{clinic.name}
                  </label>
                ))}
              </fieldset>
              <Button type="submit">Vérifier les modifications</Button>
            </form>
          ))}
        </>
      ) : <p>Aucun praticien disponible.</p>)}
    </Card>
  )
}
