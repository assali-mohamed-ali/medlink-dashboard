import { FlaskConical } from 'lucide-react'
import styles from '@/shared/ui/WorkflowPage.module.css'
import { useEffect, useState } from 'react'
import { messageFor } from '@/shared/api/errors'
import { useAuth } from '@/features/auth'
import { Button, Card } from '@/shared/ui'
import { downloadResultDocument, fetchMyResults, type ResultPage } from '../api'

/**
 * US-13: the patient's own results, newest first, one page at a time. The new ones are marked; reading a page makes
 * the results on it seen, the count of new ones says how many were waiting when the page opened.
 */
export default function MyResultsPage() {
  const { user } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<ResultPage>()
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    fetchMyResults(page).then(
      (value) => { if (current) setData(value) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [page, attempt])

  function go(next: number) {
    setData(undefined)
    setError('')
    setPage(next)
  }

  const results = data?.items
  const last = data ? Math.max(0, Math.ceil(data.total / data.size) - 1) : 0

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
    <section className={styles.resultPage}>
      <header className={styles.pageHeading}><div><h2>Mes résultats d’examens</h2><p>Consultez les résultats publiés par vos praticiens et leurs pièces jointes.</p></div><span className={styles.headingIcon}><FlaskConical size={26} aria-hidden="true" /></span></header>
      <Card>
      {downloadError && <p role="alert">{downloadError}</p>}
      {data && data.unseen > 0 && (
        <p role="status">{data.unseen} nouveau{data.unseen > 1 ? 'x' : ''} résultat{data.unseen > 1 ? 's' : ''} depuis votre dernière visite.</p>
      )}
      {error ? <div className={styles.feedback}><p role="alert">{error}</p><Button variant="secondary" onClick={() => { setError(''); setAttempt(n => n + 1) }}>Réessayer</Button></div> : !results ? <p role="status">Chargement des résultats…</p> : (
        results.length === 0 ? <p>Aucun résultat publié.</p> : (
          results.map((result) => (
            <details key={result.id} className={styles.result}>
              <summary><span>{result.title}{result.isNew && ' · Nouveau'}</span><span className={styles.readLabel} aria-hidden="true">Consulter</span></summary>
              <p className={styles.resultMeta}>{result.examType} · Examen du {result.examDate}</p>
              <p className={styles.resultMeta}>
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
      {data && last > 0 && (
        <nav className={styles.pagination} aria-label="Pages de résultats">
          <Button disabled={page === 0} onClick={() => go(page - 1)}>Page précédente</Button>
          <span> Page {page + 1} sur {last + 1} </span>
          <Button disabled={page >= last} onClick={() => go(page + 1)}>Page suivante</Button>
        </nav>
      )}
      </Card>
    </section>
  )
}
