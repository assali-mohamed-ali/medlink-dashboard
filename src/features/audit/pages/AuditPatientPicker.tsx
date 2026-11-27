import { useEffect, useState } from 'react'
import { searchPatients, type PatientChoice } from '@/features/documents'
import { messageFor } from '@/shared/api/errors'
import { Select, Skeleton, TextField } from '@/shared/ui'

type SearchResult = { query: string } & ({ patients: PatientChoice[] } | { failure: string })

export default function AuditPatientPicker({
  value,
  error,
  onChange,
}: { value: string; error?: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const query = search.trim()

  useEffect(() => {
    if (query.length < 2) return
    let current = true
    const timer = window.setTimeout(() => {
      searchPatients(query).then(
        (patients) => current && setResult({ query, patients }),
        (error) => current && setResult({ query, failure: messageFor(error) }),
      )
    }, 300)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <div>
      <TextField
        label="Rechercher un patient"
        type="search"
        autoComplete="off"
        hint="Nom, prénom ou adresse e-mail"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {query.length >= 2 && (
        result?.query !== query ? (
          <Skeleton lines={1} label="Recherche de patients" />
        ) : 'failure' in result ? (
          <p role="status">{result.failure}</p>
        ) : result.patients.length === 0 ? (
          <p role="status">Aucun patient trouvé.</p>
        ) : (
          <Select
            label="Patient"
            value={result.patients.some((patient) => patient.id === value) ? value : ''}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">Choisir un patient</option>
            {result.patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.lastName} {patient.firstName} · {patient.email}
              </option>
            ))}
          </Select>
        )
      )}
      <TextField
        label="Identifiant du patient"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
      />
    </div>
  )
}
