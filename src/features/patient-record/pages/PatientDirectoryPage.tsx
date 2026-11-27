import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Button, Card, TextField } from '@/shared/ui'
import { searchPatients, type PatientPage } from '../api'

/**
 * US-22: the practitioner's own patients, by name, full name or record number (MED-000042), one page at a time. Only
 * linked patients come back, and each one listed opens: the record applies the same link rule.
 */
export default function PatientDirectoryPage() {
  const [search, setSearch] = useState({ query: '', page: 0 })
  const [result, setResult] = useState<PatientPage>()
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    searchPatients(search.query, search.page).then(
      (data) => { if (current) setResult(data) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [search])

  function go(next: { query: string; page: number }) {
    setResult(undefined)
    setError('')
    setSearch(next)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    go({ query: String(new FormData(event.currentTarget).get('query')).trim(), page: 0 })
  }

  const last = result ? Math.max(0, Math.ceil(result.total / result.size) - 1) : 0

  return (
    <Card title="Mes patients">
      <form onSubmit={submit} role="search">
        <TextField id="directory-query" label="Nom, prénom ou numéro de dossier" name="query" maxLength={100}
          hint="Par exemple : Ben Salah, Amel Ben Salah ou MED-000042." />
        <Button type="submit">Rechercher</Button>
      </form>
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">Recherche en cours…</p> : (
        result.items.length === 0 ? <p>Aucun patient trouvé parmi vos patients.</p> : (
          <>
            <p role="status">{result.total} patient{result.total > 1 ? 's' : ''} trouvé{result.total > 1 ? 's' : ''}</p>
            <ul aria-label="Patients trouvés">
              {result.items.map((patient) => (
                <li key={patient.id}>
                  <Link to={`${paths.practitioner.patients}/${patient.id}`}>{patient.firstName} {patient.lastName}</Link>
                  {patient.recordNumber && <> · Dossier {patient.recordNumber}</>}
                </li>
              ))}
            </ul>
            {last > 0 && (
              <nav aria-label="Pages de résultats">
                <Button type="button" disabled={search.page === 0}
                  onClick={() => go({ ...search, page: search.page - 1 })}>Page précédente</Button>
                <span> Page {search.page + 1} sur {last + 1} </span>
                <Button type="button" disabled={search.page >= last}
                  onClick={() => go({ ...search, page: search.page + 1 })}>Page suivante</Button>
              </nav>
            )}
          </>
        )
      )}
    </Card>
  )
}
