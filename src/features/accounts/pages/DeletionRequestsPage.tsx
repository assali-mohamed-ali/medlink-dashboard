import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, TextField } from '@/shared/ui'
import { decideDeletion, fetchDeletionRequests, type PendingDeletion } from '../api'

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<PendingDeletion[]>()
  const [selected, setSelected] = useState<PendingDeletion>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    fetchDeletionRequests().then(
      (data) => { if (current) setRequests(data) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || busy) return
    const fields = new FormData(event.currentTarget)
    const decision = fields.get('decision') === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    const note = String(fields.get('note')).trim()
    if (decision === 'REJECTED' && !note) {
      setError('Un motif est obligatoire pour refuser la demande.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const decided = await decideDeletion(selected.patientId, decision, note)
      setRequests((value) => value?.filter((request) => request.patientId !== selected.patientId))
      setSelected(undefined)
      setNotice(decided?.accountClosedAt
        ? 'Demande approuvée : le compte est clôturé et ses sessions sont fermées. Le dossier est conservé.'
        : 'Décision enregistrée : le patient voit le motif dans son profil.')
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Demandes de suppression">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!requests && !error && <p role="status">Chargement des demandes…</p>}
      {requests?.length === 0 && <p>Aucune demande en attente.</p>}
      {requests && !selected && (
        <ul>{requests.map((request) => (
          <li key={request.patientId}>
            <Button onClick={() => {
              setSelected(request)
              setNotice('')
            }}>{request.firstName} {request.lastName}</Button>
          </li>
        ))}</ul>
      )}
      {selected && (
        <form className="grid gap-3" onSubmit={submit}>
          <h3>{selected.firstName} {selected.lastName}</h3>
          <p>Réponse attendue avant le {new Date(selected.dueAt).toLocaleDateString('fr-TN')}.</p>
          {selected.retainedUntil && <p>Conservation prévue jusqu’au {new Date(selected.retainedUntil).toLocaleDateString('fr-TN')}.</p>}
          <label>Décision <select name="decision">
            <option value="REJECTED">Refuser</option>
            <option value="APPROVED">Approuver la demande</option>
          </select></label>
          <p>
            Approuver clôture le compte du patient et ferme ses sessions ; son dossier médical et le journal d’audit sont
            conservés. L’anonymisation et la purge ne sont pas réalisées tant que la politique de conservation n’est pas
            approuvée. L’approbation est refusée tant que la durée de conservation court.
          </p>
          <TextField id="deletion-note" label="Motif transmis au patient" name="note" maxLength={500} />
          <Button type="submit" disabled={busy}>Confirmer la décision</Button>
          <Button type="button" disabled={busy} onClick={() => setSelected(undefined)}>Annuler</Button>
        </form>
      )}
    </Card>
  )
}
