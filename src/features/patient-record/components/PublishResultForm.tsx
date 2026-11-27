import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, TextField } from '@/shared/ui'
import { fetchPublishedResults, publishResult, type ExamResult, type ResultInput } from '../api'

export default function PublishResultForm({ patientId }: { patientId: string }) {
  const [draft, setDraft] = useState<ResultInput>()
  const [history, setHistory] = useState<ExamResult[]>()
  const [historyError, setHistoryError] = useState('')
  useEffect(() => {
    let current = true
    fetchPublishedResults(patientId).then(
      (data) => { if (current) setHistory(data) },
      (cause) => { if (current) setHistoryError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [patientId])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const title = String(fields.get('title')).trim()
    const content = String(fields.get('content')).trim()
    if (!title || !content) {
      setError('Saisissez un titre et le résultat.')
      return
    }
    setDraft({
      title,
      content,
      examType: String(fields.get('examType')).trim(),
      examDate: String(fields.get('examDate')),
      documentId: String(fields.get('documentId')).trim() || undefined,
    })
    setError('')
    setPublished(false)
  }

  async function publish() {
    if (busy || !draft) return
    setBusy(true)
    setError('')
    try {
      const result = await publishResult(patientId, draft)
      setHistory((previous) => [result, ...(previous ?? [])])
      setDraft(undefined)
      setPublished(true)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Publier un résultat d’examen">
      {error && <p role="alert">{error}</p>}
      {published && <p role="status">Résultat publié dans l’espace du patient.</p>}
      {draft ? (
        <div>
          <h3>{draft.title}</h3>
          <p>{draft.examType} · {draft.examDate}</p>
          {draft.documentId && <p>Référence du document associé affichée dans le résultat.</p>}
          <p className="whitespace-pre-wrap break-words">{draft.content}</p>
          <Button disabled={busy} onClick={() => void publish()}>Confirmer la publication</Button>
          <Button disabled={busy} onClick={() => setDraft(undefined)}>Annuler</Button>
        </div>
      ) : (
        <form onSubmit={review}>
          <TextField id="result-title" label="Titre de l’examen" name="title" required maxLength={200} />
          <TextField id="result-type" label="Type d’examen" name="examType" required maxLength={100} />
          <TextField id="result-date" label="Date de l’examen" name="examDate" type="date" required />
          <TextField id="result-document" label="Identifiant d’un document patient existant (facultatif)"
            name="documentId" maxLength={36} />
          <label className="block" htmlFor="result-content">Résultat</label>
          <textarea className="w-full rounded-md border p-2" id="result-content" name="content" required maxLength={10000} />
          <Button type="submit">Relire le résultat</Button>
        </form>
      )}
      <h3>Résultats publiés</h3>
      {historyError ? <p role="alert">{historyError}</p> : !history ? <p role="status">Chargement…</p> : (
        history.length === 0 ? <p>Aucun résultat publié par vous.</p> : (
          <ul>{history.map((result) => <li key={result.id}>{result.title} · {result.examDate}</li>)}</ul>
        )
      )}
    </Card>
  )
}
