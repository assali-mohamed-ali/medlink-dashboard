import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, Checkbox } from '@/shared/ui'
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences as Preferences,
} from '../api'

/**
 * US-15: the patient chooses which optional mails they receive. The booking confirmation and the security mails are
 * always sent; MedLink sends no SMS, so e-mail is the only channel named.
 */
export default function NotificationPreferences() {
  const [saved, setSaved] = useState<Preferences>()
  const [draft, setDraft] = useState<Preferences>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    fetchNotificationPreferences().then(
      (value) => {
        if (current) {
          setSaved(value)
          setDraft(value)
        }
      },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !draft) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const value = await saveNotificationPreferences(draft)
      setSaved(value)
      setDraft(value)
      setNotice('Vos préférences de notification ont été enregistrées.')
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  const changed = !!saved && !!draft
    && (saved.appointmentReminders !== draft.appointmentReminders || saved.examResults !== draft.examResults)

  return (
    <Card title="Notifications">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!draft && !error && <p role="status">Chargement de vos préférences…</p>}
      {draft && (
        <form onSubmit={save}>
          <p>Choisissez les e-mails que vous recevez. La confirmation d’un rendez-vous est toujours envoyée.</p>
          <Checkbox
            id="notify-reminders"
            label="Rappel par e-mail dans les 24 heures avant chaque rendez-vous"
            checked={draft.appointmentReminders}
            onChange={(event) => setDraft({ ...draft, appointmentReminders: event.target.checked })}
          />
          <Checkbox
            id="notify-results"
            label="E-mail quand un nouveau résultat d’examen est disponible"
            hint="Le message ne contient aucune information médicale : le résultat se lit dans votre espace."
            checked={draft.examResults}
            onChange={(event) => setDraft({ ...draft, examResults: event.target.checked })}
          />
          <Button type="submit" disabled={busy || !changed}>Enregistrer mes préférences</Button>
        </form>
      )}
    </Card>
  )
}
