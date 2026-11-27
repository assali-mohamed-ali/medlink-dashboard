import { useEffect, useState } from 'react'
import { messageFor } from '@/shared/api/errors'
import { useAuth } from '@/features/auth'
import { Button, Card } from '@/shared/ui'
import { downloadResultDocument, fetchMyResults, type ExamResult } from '../api'

export default function MyResultsPage() {
  const { user } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [results, setResults] = useState<ExamResult[]>()
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    fetchMyResults().then(
      (data) => { if (current) setResults(data) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function download(documentId: string) {
    if (!user || downloading) return
    setDownloading(true)
    setDownloadError('')
    try {
      const { blob, filename } = await downloadResultDocument(user.id, documentId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ?? 'document-medical'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setDownloadError(messageFor(cause))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card title="Mes résultats d’examens">
      {downloadError && <p role="alert">{downloadError}</p>}
      {error ? <p role="alert">{error}</p> : !results ? <p role="status">Chargement des résultats…</p> : (
        results.length === 0 ? <p>Aucun résultat publié.</p> : (
          results.map((result) => (
            <details key={result.id} className="border-b py-3">
              <summary>{result.title}{result.isNew && ' · Nouveau'}</summary>
              <p>{result.examType} · Examen du {result.examDate}</p>
              <p>
                Publié le {new Intl.DateTimeFormat('fr-TN', { timeZone: 'Africa/Tunis' }).format(new Date(result.publishedAt))}
                {result.practitioner && ` · ${result.practitioner.firstName} ${result.practitioner.lastName}`}
              </p>
              <p className="whitespace-pre-wrap break-words">{result.content}</p>
              {result.documentId && <Button disabled={downloading} onClick={() => {
                if (result.documentId) void download(result.documentId)
              }}>Télécharger le document</Button>}
            </details>
          ))
        )
      )}
    </Card>
  )
}
