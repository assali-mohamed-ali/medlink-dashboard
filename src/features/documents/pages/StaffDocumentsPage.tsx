import { useEffect, useState } from 'react'
import { FolderLock, Search, Users } from 'lucide-react'
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

  const chosenPatient = patients && 'data' in patients ? patients.data.find(patient => patient.id === selected) : undefined
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
    <div className={styles.workspace} data-width="wide">
      <header>
        <h2 className={styles.title}>Documents patients</h2>
        <p className={styles.intro}>
          Identifiez le patient avant de consulter ou d’ajouter un document à son dossier.
        </p>
      </header>
      <div className={styles.split}>
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
          {chosenPatient && <div className={styles.selectedPatient}><strong>{chosenPatient.firstName} {chosenPatient.lastName}</strong><small>{chosenPatient.email}</small><Button variant="secondary" size="sm" onClick={() => setSelected('')}>Changer de patient</Button></div>}
        </Card>
        <div className={styles.documentStack}>
          {selected ? (
            <DocumentsPanel key={selected} patientId={selected} canUpload />
          ) : (
            <Card title="Documents du patient" headingLevel={3}>
              <EmptyState icon={FolderLock} title="Aucun patient sélectionné" headingLevel={4} compact>
                Choisissez un patient pour voir et ajouter ses documents.
              </EmptyState>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
