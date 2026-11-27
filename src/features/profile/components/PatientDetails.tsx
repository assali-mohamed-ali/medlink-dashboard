import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, TextField } from '@/shared/ui'
import { fetchContactDetails, saveContactDetails, type ContactDetails } from '../api'

export default function PatientDetails() {
  const [details, setDetails] = useState<ContactDetails>()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let current = true
    fetchContactDetails().then(
      (value) => { if (current) setDetails(value) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    const phone = String(form.get('phone')).trim()
    const address = String(form.get('address')).trim()
    setBusy(true)
    setError('')
    try {
      setDetails(await saveContactDetails(phone, address))
      setEditing(false)
      setSaved(true)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Coordonnées">
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Vos coordonnées ont été enregistrées.</p>}
      {!details && !error && <p role="status">Chargement des coordonnées…</p>}
      {details && (editing ? (
        <form onSubmit={save}>
          <TextField id="patient-phone" label="Téléphone" name="phone" type="tel"
            autoComplete="tel" maxLength={30} pattern={'\\+?[0-9 ]*'} defaultValue={details.phone ?? ''} />
          <TextField id="patient-address" label="Adresse" name="address"
            autoComplete="street-address" maxLength={255} defaultValue={details.address ?? ''} />
          <Button type="submit" disabled={busy}>Enregistrer</Button>
          <Button type="button" disabled={busy} onClick={() => {
            setError('')
            setEditing(false)
          }}>Annuler</Button>
        </form>
      ) : (
        <>
          <dl>
            <dt>Téléphone</dt><dd>{details.phone || 'Non renseigné'}</dd>
            <dt>Adresse</dt><dd>{details.address || 'Non renseignée'}</dd>
          </dl>
          <Button type="button" onClick={() => {
            setSaved(false)
            setEditing(true)
          }}>Modifier mes coordonnées</Button>
        </>
      ))}
    </Card>
  )
}
