import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Button, Card, TextField } from '@/shared/ui'
import { searchPatients, type PatientSummary } from '../api'

export default function PatientDirectoryPage() {
  const [search, setSearch] = useState({ query: '' })
  const [result, setResult] = useState<PatientSummary[]>()
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    searchPatients(search.query).then(
      (data) => { if (current) setResult(data) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [search])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult(undefined)
    setError('')
    setSearch({ query: String(new FormData(event.currentTarget).get('query')).trim() })
  }

  return (
    <Card title="Mes patients">
      <form onSubmit={submit}>
        <TextField id="directory-query" label="Nom ou prénom" name="query" maxLength={100} />
        <Button type="submit">Rechercher</Button>
      </form>
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">Recherche en cours…</p> : (
        result.length === 0 ? <p>Aucun patient trouvé.</p> : (
          <ul>
            {result.map((patient) => (
              <li key={patient.id}>
                <Link to={`${paths.practitioner.patients}/${patient.id}`}>{patient.firstName} {patient.lastName}</Link>
              </li>
            ))}
          </ul>
        )
      )}
    </Card>
  )
}
