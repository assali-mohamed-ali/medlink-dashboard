import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import styles from './PublishResultForm.module.css'
import { Alert, Button, Card, Select, TextField, WorkflowSteps } from '@/shared/ui'
import {
  fetchPatientFiles,
  fetchPublishedResults,
  publishResult,
  uploadPatientFile,
  type ExamResult,
  type PatientFile,
  type ResultInput,
} from '../api'

/** The API accepts these (checked on the file's bytes); the browser filter only helps the practitioner choose. */
const ACCEPT = 'application/pdf,image/png,image/jpeg'
const MAX_FILE_BYTES = 10 * 1024 * 1024

/**
 * US-25: the practitioner reviews then publishes a result for an attached patient. The attachment is one of the
 * patient's documents, picked from their list, or a file uploaded here (the API validates, encrypts and stores it).
 * Each reviewed draft carries one request id: confirming twice (or a retried request) publishes once.
 */
export default function PublishResultForm({ patientId }: { patientId: string }) {
  const [draft, setDraft] = useState<ResultInput & { file?: File; fileLabel?: string }>()
  const [history, setHistory] = useState<ExamResult[]>()
  const [historyError, setHistoryError] = useState('')
  const [files, setFiles] = useState<PatientFile[]>()
  const [filesError, setFilesError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)
  const [view, setView] = useState<'all' | 'publish' | 'history' | 'files'>('all')

  useEffect(() => {
    let current = true
    fetchPublishedResults(patientId).then(
      (data) => { if (current) setHistory(data.items) },
      (cause) => { if (current) setHistoryError(messageFor(cause)) },
    )
    fetchPatientFiles(patientId).then(
      (data) => { if (current) setFiles(data.items) },
      (cause) => { if (current) setFilesError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [patientId])

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const title = String(fields.get('title')).trim()
    const content = String(fields.get('content')).trim()
    if (!title || !content) {
      setError('Saisissez un titre et le résultat.')
      return
    }
    // The chosen file from its input: a form without one still has an empty entry, which does not count
    const input = event.currentTarget.elements.namedItem('file')
    const chosen = input instanceof HTMLInputElement ? input.files?.[0] : undefined
    const file = chosen && chosen.size > 0 ? chosen : undefined
    if (file && file.size > MAX_FILE_BYTES) {
      setError('Le fichier dépasse 10 Mo.')
      return
    }
    const documentId = file ? undefined : String(fields.get('documentId') ?? '') || undefined
    setDraft({
      title,
      content,
      examType: String(fields.get('examType')).trim(),
      examDate: String(fields.get('examDate')),
      documentId,
      file,
      fileLabel: file ? file.name : files?.find((f) => f.id === documentId)?.title,
      requestId: crypto.randomUUID(),
    })
    setError('')
    setPublished(false)
  }

  async function publish() {
    if (busy || !draft) return
    setBusy(true)
    setError('')
    try {
      let documentId = draft.documentId
      if (draft.file) {
        // Uploaded once: a retry after a failed publication reuses it
        const stored = await uploadPatientFile(patientId, draft.title, draft.file)
        documentId = stored.id
        setFiles((previous) => [stored, ...(previous ?? [])])
        setDraft({ ...draft, file: undefined, documentId })
      }
      const { file: _file, fileLabel: _label, ...input } = draft
      const result = await publishResult(patientId, { ...input, documentId })
      // The publish answer leaves the texts out (the practitioner just wrote them): show the draft's
      setHistory((previous) => [
        { ...result, title: draft.title, examType: draft.examType },
        ...(previous ?? []).filter((r) => r.id !== result.id),
      ])
      setDraft(undefined)
      setPublished(true)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Publier un résultat d’examen" className={styles.card}>
      <div role="group" aria-label="Résultats et pièces jointes">
        {([['all','Tout afficher'],['publish','Publier'],['history','Résultats publiés'],['files','Pièces jointes autorisées']] as const).map(([id,label]) => <Button key={id} size="sm" variant={view === id ? 'primary' : 'secondary'} aria-pressed={view === id} onClick={() => setView(id)}>{label}</Button>)}
      </div>
      <div hidden={view !== 'all' && view !== 'publish'}>
      <WorkflowSteps steps={['Saisir le résultat', 'Vérifier', 'Publier']} current={published ? 2 : draft ? 1 : 0} />
      {error && <Alert tone="error">{error}</Alert>}
      {published && <p role="status">Résultat publié dans l’espace du patient. Il en est prévenu par e-mail s’il l’a accepté.</p>}
      {draft ? (
        <div className={styles.review}>
          <h3>{draft.title}</h3>
          <p>{draft.examType} · {draft.examDate}</p>
          {draft.fileLabel && <p>Pièce jointe : {draft.fileLabel}</p>}
          <p className="whitespace-pre-wrap break-words">{draft.content}</p>
          <Button disabled={busy} onClick={() => void publish()}>Confirmer la publication</Button>
          <Button variant="secondary" disabled={busy} onClick={() => setDraft(undefined)}>Annuler</Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={review}>
          <TextField id="result-title" label="Titre de l’examen" name="title" required maxLength={200} />
          <TextField id="result-type" label="Type d’examen" name="examType" required maxLength={100} />
          <TextField id="result-date" label="Date de l’examen" name="examDate" type="date" required />
          {filesError ? <p role="alert">{filesError}</p> : (
            <Select id="result-document" label="Document du patient à joindre (facultatif)" name="documentId"
              defaultValue="">
              <option value="">Aucun document</option>
              {(files ?? []).map((f) => <option key={f.id} value={f.id}>{f.title} ({f.originalFilename})</option>)}
            </Select>
          )}
          <label className="block" htmlFor="result-file">Ou déposer un nouveau fichier (PDF, PNG ou JPEG, 10 Mo au plus)</label>
          <input id="result-file" name="file" type="file" accept={ACCEPT} />
          <label className="block" htmlFor="result-content">Résultat</label>
          <textarea className={styles.textarea} id="result-content" name="content" required maxLength={10000} />
          <Button type="submit">Relire le résultat</Button>
        </form>
      )}
      </div><section hidden={view !== 'all' && view !== 'history'}><h3>Résultats publiés</h3>
      {historyError ? <p role="alert">{historyError}</p> : !history ? <p role="status">Chargement…</p> : (
        history.length === 0 ? <p>Aucun résultat publié par vous.</p> : (
          <ul>{history.map((result) => <li key={result.id}>{result.title} · {result.examDate}</li>)}</ul>
        )
      )}
      </section>
      <section hidden={view !== 'files'}><h3>Pièces jointes autorisées</h3>{filesError ? <p role="alert">{filesError}</p> : !files ? <p role="status">Chargement…</p> : files.length === 0 ? <p>Aucune pièce jointe disponible.</p> : <ul>{files.map(file => <li key={file.id}>{file.title} · {file.originalFilename}</li>)}</ul>}<p>Les documents disponibles peuvent être joints à un résultat depuis le formulaire de publication.</p></section>
    </Card>
  )
}
