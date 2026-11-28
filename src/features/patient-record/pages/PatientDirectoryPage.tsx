import styles from '@/shared/ui/WorkflowPage.module.css'
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
    <section className={styles.workspace}>
      <header className={styles.pageHeading}><div><h2>Mes patients</h2><p>Recherchez uniquement les dossiers des patients qui vous sont rattachés.</p></div></header>
      <Card title="Annuaire des patients" headingLevel={3}>
      <form className={styles.search} onSubmit={submit} role="search">
        <TextField id="directory-query" label="Nom, prénom ou numéro de dossier" name="query" maxLength={100}
          hint="Par exemple : Ben Salah, Amel Ben Salah ou MED-000042." />
        <Button type="submit">Rechercher</Button>
      </form>
      {error ? <div className={styles.feedback}><p role="alert">{error}</p><Button variant="secondary" onClick={() => go({ ...search })}>Réessayer</Button></div> : !result ? <p role="status">Recherche en cours…</p> : (
        result.items.length === 0 ? <p>Aucun patient trouvé parmi vos patients.</p> : (
          <>
            <p role="status">{result.total} patient{result.total > 1 ? 's' : ''} trouvé{result.total > 1 ? 's' : ''}</p>
            <div className={styles.tableScroll}><table className={styles.directory}><caption>Patients trouvés</caption><thead><tr><th scope="col">Patient</th><th scope="col">N° de dossier</th><th scope="col">Action</th></tr></thead><tbody>
              {result.items.map((patient) => (
                <tr key={patient.id}><td><span className={styles.person}><span aria-hidden="true" className={styles.initials}>{patient.firstName.charAt(0)}{patient.lastName.charAt(0)}</span><strong>{patient.firstName} {patient.lastName}</strong></span></td><td>{patient.recordNumber ? `Dossier ${patient.recordNumber}` : 'Non renseigné'}</td><td><Link className={styles.outlineLink} aria-label={`${patient.firstName} ${patient.lastName}`} to={`${paths.practitioner.patients}/${encodeURIComponent(patient.id)}`}>Ouvrir le dossier</Link></td></tr>
              ))}
            </tbody></table></div>
            {last > 0 && (
              <nav className={styles.pagination} aria-label="Pages de résultats">
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
    </section>
  )
}
