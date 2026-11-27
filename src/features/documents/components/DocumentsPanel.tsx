import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, FileText, FileUp, Image as ImageIcon } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Card, EmptyState, Skeleton, TextField } from '@/shared/ui'
import {
  ACCEPTED_TYPES,
  MAX_FILE_BYTES,
  PAGE_SIZE,
  downloadDocument,
  fetchDocuments,
  uploadDocument,
} from '../api'
import type { DocumentPage, PatientDocument } from '../types'
import styles from './DocumentsPanel.module.css'

type Load =
  | { status: 'loading' }
  | { status: 'ready'; page: DocumentPage }
  | { status: 'error'; message: string }

type Notice = { tone: 'success' | 'error'; text: string }

type Props = {
  patientId: string
  /** Staff upload; a patient only reads their own documents. */
  canUpload: boolean
}

const TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function typeLabel(contentType: string): string {
  return TYPE_LABELS[contentType] ?? contentType
}

function extensionOf(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

/** The browser saves the bytes under the name the API gave, then lets go of the blob URL. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function validate(title: string, file: File | null): string | null {
  const clean = title.trim()
  if (!clean) return 'Le titre est obligatoire.'
  if (clean.length > 200) return 'Le titre ne doit pas dépasser 200 caractères.'
  if (!file) return 'Choisissez un fichier.'
  if (file.size === 0) return 'Le fichier est vide.'
  if (file.size > MAX_FILE_BYTES) return 'Le fichier dépasse la taille maximale de 10 Mo.'
  const allowedByType = file.type === '' || (ACCEPTED_TYPES as readonly string[]).includes(file.type)
  const allowedByExtension = ['pdf', 'png', 'jpg', 'jpeg'].includes(extensionOf(file.name))
  if (!allowedByType && !allowedByExtension) return 'Seuls les fichiers PDF, PNG et JPEG sont acceptés.'
  return null
}

function DocumentLine({ document, onDownload }: { document: PatientDocument; onDownload: (document: PatientDocument) => void }) {
  const Icon = document.contentType === 'application/pdf' ? FileText : ImageIcon
  return (
    <tr>
      <td>
        <span className={styles.titleCell}>
          <Icon size={18} aria-hidden="true" />
          <span>{document.title}</span>
        </span>
      </td>
      <td className={styles.filename}>{document.originalFilename}</td>
      <td>{typeLabel(document.contentType)}</td>
      <td className={styles.number}>{sizeLabel(document.sizeBytes)}</td>
      <td className={styles.date}>{dateLabel(document.createdAt)}</td>
      <td>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Télécharger ${document.title}`}
          onClick={() => onDownload(document)}
        >
          <Download size={16} aria-hidden="true" />
          Télécharger
        </Button>
      </td>
    </tr>
  )
}

/**
 * The documents of one patient (MLink-123/125): staff upload, list and download; the patient lists and downloads
 * their own. The API is the only source of truth; the page keeps nothing in browser storage.
 */
export default function DocumentsPanel({ patientId, canUpload }: Props) {
  const fileId = useId()
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let current = true
    setLoad({ status: 'loading' })
    fetchDocuments(patientId, page).then(
      (data) => current && setLoad({ status: 'ready', page: data }),
      (error) => current && setLoad({ status: 'error', message: messageFor(error) }),
    )
    return () => {
      current = false
    }
  }, [patientId, page, attempt])

  function retry() {
    setAttempt((count) => count + 1)
  }

  async function download(document: PatientDocument) {
    setNotice(null)
    try {
      const { blob, filename } = await downloadDocument(patientId, document.id)
      saveBlob(blob, filename ?? document.originalFilename)
    } catch (error) {
      setNotice({ tone: 'error', text: messageFor(error) })
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) return
    const problem = validate(title, file)
    setFormError(problem)
    if (problem || !file) return
    setUploading(true)
    setNotice(null)
    try {
      await uploadDocument(patientId, title.trim(), file)
      setTitle('')
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      setNotice({ tone: 'success', text: 'Le document a été ajouté.' })
      if (page === 0) retry()
      else setPage(0)
    } catch (error) {
      setNotice({ tone: 'error', text: messageFor(error) })
    } finally {
      setUploading(false)
    }
  }

  const data = load.status === 'ready' ? load.page : null
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      {canUpload && (
        <Card title="Ajouter un document" headingLevel={3}>
          <form onSubmit={submit} noValidate aria-label="Ajouter un document">
            <div className={styles.form}>
              <TextField
                label="Titre"
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                error={formError?.startsWith('Le titre') ? formError : undefined}
              />
              <div className={styles.fileField}>
                <label htmlFor={fileId} className={styles.fileLabel}>
                  Fichier
                </label>
                <input
                  ref={fileInput}
                  id={fileId}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  className={styles.fileInput}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null)
                    setFormError(null)
                  }}
                />
                <p className={styles.hint}>PDF, PNG ou JPEG, 10 Mo au maximum.</p>
              </div>
            </div>
            {formError && !formError.startsWith('Le titre') && (
              <p className={styles.error} role="alert">
                {formError}
              </p>
            )}
            <div className={styles.actions}>
              <Button type="submit" loading={uploading}>
                <FileUp size={16} aria-hidden="true" />
                Ajouter le document
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Documents" headingLevel={3}>
        {load.status === 'loading' && <Skeleton lines={4} label="Chargement des documents…" />}

        {load.status === 'error' && (
          <div className={styles.failure}>
            <Alert tone="error">{load.message}</Alert>
            <Button variant="secondary" onClick={retry}>
              Réessayer
            </Button>
          </div>
        )}

        {load.status === 'ready' && load.page.items.length === 0 && (
          <EmptyState icon={FileText} title="Aucun document" compact>
            {canUpload
              ? 'Ajoutez un compte rendu, une ordonnance ou un résultat pour ce patient.'
              : 'Vos documents apparaîtront ici dès que le personnel les aura ajoutés.'}
          </EmptyState>
        )}

        {load.status === 'ready' && load.page.items.length > 0 && (
          <>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <caption className="visually-hidden">Documents du patient</caption>
                <thead>
                  <tr>
                    <th scope="col">Titre</th>
                    <th scope="col">Fichier</th>
                    <th scope="col">Type</th>
                    <th scope="col" className={styles.number}>
                      Taille
                    </th>
                    <th scope="col">Ajouté le</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {load.page.items.map((document) => (
                    <DocumentLine key={document.id} document={document} onDownload={download} />
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="Pagination des documents" className={styles.pager}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Précédent
              </Button>
              <span>{`Page ${data ? data.page + 1 : page + 1} sur ${pages}`}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page + 1 >= pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </Button>
            </nav>
          </>
        )}
      </Card>
    </>
  )
}
