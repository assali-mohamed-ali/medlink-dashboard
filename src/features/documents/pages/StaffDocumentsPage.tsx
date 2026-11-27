import { useEffect, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, Card, EmptyState, Select, Skeleton, TextField } from '@/shared/ui'
import { searchPatients } from '../api'
import type { PatientChoice } from '../types'
import DocumentsPanel from '../components/DocumentsPanel'
import styles from './DocumentsPages.module.css'

const SEARCH_PAUSE_MS = 300

type Loaded = { data: PatientChoice[] } | { failure: string } | null

const patientLabel = (patient: PatientChoice) =>
  `${patient.lastName} ${patient.firstName} · ${patient.email}`

/**
 * Staff documents (MLink-123/125): find a patient in the accounts list, then upload, list and download their
 * documents. The patient's medical record is never shown here.
 */
export default function StaffDocumentsPage() {
  const [typed, setTyped] = useState('')
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [patients, setPatients] = useState<Loaded>(null)
  const [selected, setSelected] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(typed.trim()), SEARCH_PAUSE_MS)
    return () => window.clearTimeout(timer)
  }, [typed])

  useEffect(() => {
    let current = true
    setPatients(null)
    searchPatients(search).then(
      (data) => {
        if (!current) return
        setPatients({ data })
        setSelected((chosen) => (data.some((patient) => patient.id === chosen) ? chosen : ''))
      },
      (error) => current && setPatients({ failure: messageFor(error) }),
    )
    return () => {
      current = false
    }
  }, [search, attempt])

  let picker
  if (patients === null) {
    picker = <Skeleton lines={2} label="Chargement des patients…" />
  } else if ('failure' in patients) {
    picker = (
      <div className={styles.failure}>
        <Alert tone="error">{patients.failure}</Alert>
        <Button
          variant="secondary"
          onClick={() => {
            setPatients(null)
            setAttempt((count) => count + 1)
          }}
        >
          Réessayer
        </Button>
      </div>
    )
  } else if (patients.data.length === 0) {
    picker = (
      <EmptyState icon={Users} title="Aucun patient" compact>
        Aucun patient ne correspond à cette recherche.
      </EmptyState>
    )
  } else {
    picker = (
      <Select label="Patient" value={selected} onChange={(event) => setSelected(event.target.value)}>
        <option value="">Choisir un patient</option>
        {patients.data.map((patient) => (
          <option key={patient.id} value={patient.id}>
            {patientLabel(patient)}
          </option>
        ))}
      </Select>
    )
  }

  return (
    <>
      <h2>Documents patients</h2>
      <p className={styles.intro}>
        Ajoutez un compte rendu, une ordonnance ou un résultat à un patient, puis consultez ses documents.
      </p>
      <Card title="Choisir un patient" headingLevel={3}>
        <div className={styles.searchRow}>
          <TextField
            label="Rechercher un patient"
            type="search"
            autoComplete="off"
            placeholder="Nom, prénom ou adresse e-mail"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            endAdornment={<Search size={18} aria-hidden="true" />}
          />
        </div>
        {picker}
      </Card>
      {selected ? (
        <DocumentsPanel key={selected} patientId={selected} canUpload />
      ) : (
        <p className={styles.muted}>Choisissez un patient pour voir et ajouter ses documents.</p>
      )}
    </>
  )
}
