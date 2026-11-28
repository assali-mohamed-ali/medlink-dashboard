import styles from '@/shared/ui/WorkflowPage.module.css'
import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, Select, TextField } from '@/shared/ui'
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
    <section className={styles.workspace} data-width="wide">
      <header className={styles.pageHeading}><div><h2>Demandes de suppression</h2><p>Traitez les demandes et vérifiez la durée de conservation applicable.</p></div></header>
      <div className={styles.split}><Card title="Demandes à examiner" headingLevel={3}>
      <div className={styles.feedback}><p>Les demandes sont examinées au regard des obligations de conservation. Aucune destruction automatique de données médicales.</p></div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!requests && !error && <p role="status">Chargement des demandes…</p>}
      {requests?.length === 0 && <p>Aucune demande en attente.</p>}
      {requests && (
        <ul className={styles.rows} aria-label="Demandes à examiner">{requests.map((request) => (
          <li key={request.patientId} className={styles.requestRow}>
            <div><strong>À examiner</strong><p>Réponse avant le {new Date(request.dueAt).toLocaleDateString('fr-TN')}</p>{request.retainedUntil && <p>Conservation jusqu’au {new Date(request.retainedUntil).toLocaleDateString('fr-TN')}</p>}</div>
            <Button variant={selected?.patientId === request.patientId ? 'primary' : 'secondary'} disabled={busy} aria-pressed={selected?.patientId === request.patientId} onClick={() => {
              setSelected(request)
              setNotice('')
            }}>{request.firstName} {request.lastName}</Button>
          </li>
        ))}</ul>
      )}
      </Card><Card title="Examen de la demande" headingLevel={3}>
      {!selected && <p>Sélectionnez une demande pour examiner les obligations de conservation.</p>}
      {selected && (
        <form key={selected.patientId} className={styles.impact} onSubmit={submit}>
          <h3>{selected.firstName} {selected.lastName}</h3>
          <p>Réponse attendue avant le {new Date(selected.dueAt).toLocaleDateString('fr-TN')}.</p>
          {selected.retainedUntil && <p>Conservation prévue jusqu’au {new Date(selected.retainedUntil).toLocaleDateString('fr-TN')}.</p>}
          <Select label="Décision" name="decision" disabled={busy}>
            <option value="REJECTED">Refuser</option>
            <option value="APPROVED">Approuver la demande</option>
          </Select>
          <p>
            Approuver clôture le compte du patient et ferme ses sessions ; son dossier médical et le journal d’audit sont
            conservés. L’anonymisation et la purge ne sont pas réalisées tant que la politique de conservation n’est pas
            approuvée. L’approbation est refusée tant que la durée de conservation court.
          </p>
          <TextField id="deletion-note" label="Motif transmis au patient" name="note" maxLength={500} />
          <Button type="submit" disabled={busy}>Confirmer la décision</Button>
          <Button variant="secondary" type="button" disabled={busy} onClick={() => setSelected(undefined)}>Annuler</Button>
        </form>
      )}
      </Card></div>
    </section>
  )
}
