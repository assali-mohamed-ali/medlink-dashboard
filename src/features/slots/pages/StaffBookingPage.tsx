import { useEffect, useState, type FormEvent } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card, TextField } from '@/shared/ui'
import { bookForPatient, fetchStaffSlotFilters, searchBookingPatients, searchStaffSlots } from '../api'
import type { Appointment, Slot, SlotFilters, SlotSearch } from '../types'

const dateTime = new Intl.DateTimeFormat('fr-TN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Tunis',
})
type Patients = Awaited<ReturnType<typeof searchBookingPatients>>
type Patient = Patients['items'][number]

export default function StaffBookingPage() {
  const [patientQuery, setPatientQuery] = useState('')
  const [patientPage, setPatientPage] = useState(0)
  const [patients, setPatients] = useState<Patients>()
  const [patient, setPatient] = useState<Patient>()
  const [filters, setFilters] = useState<SlotFilters>()
  const [search, setSearch] = useState<SlotSearch>()
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof searchStaffSlots>>>()
  const [selected, setSelected] = useState<Slot>()
  const [appointment, setAppointment] = useState<Appointment>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    fetchStaffSlotFilters().then(
      (value) => { if (current) setFilters(value) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function lookup(query: string, page: number) {
    setBusy(true)
    setError('')
    setPatients(undefined)
    setPatientQuery(query)
    setPatientPage(page)
    try {
      setPatients(await searchBookingPatients(query, page))
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  async function findSlots(criteria: SlotSearch) {
    setBusy(true)
    setError('')
    setSlots(undefined)
    setSelected(undefined)
    setSearch(criteria)
    try {
      setSlots(await searchStaffSlots(criteria))
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  function submitSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const from = Date.parse(`${fields.get('date')}T00:00:00+01:00`)
    if (!Number.isFinite(from)) return
    void findSlots({
      from: new Date(from).toISOString(),
      to: new Date(from + 86400000).toISOString(),
      practitionerId: String(fields.get('practitionerId')) || undefined,
      clinicId: String(fields.get('clinicId')) || undefined,
      specialtyId: String(fields.get('specialtyId')) || undefined,
      page: 0,
      size: 20,
    })
  }

  async function confirm() {
    if (!patient || !selected || busy) return
    setBusy(true)
    setError('')
    try {
      setAppointment(await bookForPatient(patient.id, selected.slotId))
      setSelected(undefined)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Réserver pour un patient">
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Chargement…</p>}
      {appointment && patient ? (
        <>
          <p role="status">Réservation confirmée pour {patient.firstName} {patient.lastName}.</p>
          <p>{dateTime.format(new Date(appointment.startsAt))} · {appointment.clinic.name} · {appointment.practitioner.firstName}{' '}
            {appointment.practitioner.lastName}</p>
          <p>Référence {appointment.id}</p>
          <Button onClick={() => {
            setAppointment(undefined)
            setPatient(undefined)
            setPatients(undefined)
            setSlots(undefined)
            setSearch(undefined)
          }}>Nouvelle réservation</Button>
        </>
      ) : !patient ? (
        <>
          <form onSubmit={(event) => {
            event.preventDefault()
            const query = String(new FormData(event.currentTarget).get('query')).trim()
            if (!busy && query) void lookup(query, 0)
          }}>
            <TextField id="booking-patient" name="query" label="Nom ou e-mail du patient" required maxLength={100} />
            <Button disabled={busy} type="submit">Rechercher un patient</Button>
          </form>
          {patients && (
            <>
              {patients.items.length === 0 && <p>Aucun patient éligible sur cette page.</p>}
              <ul>{patients.items.map((entry) => (
                <li key={entry.id}><Button disabled={busy} onClick={() => setPatient(entry)}>
                  {entry.firstName} {entry.lastName} · {entry.email}
                </Button></li>
              ))}</ul>
              {patientPage > 0 && <Button disabled={busy} onClick={() => void lookup(patientQuery, patientPage - 1)}>Précédent</Button>}
              {(patientPage + 1) * 20 < patients.total && (
                <Button disabled={busy} onClick={() => void lookup(patientQuery, patientPage + 1)}>Suivant</Button>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <p>Patient sélectionné · {patient.firstName} {patient.lastName}</p>
          <Button disabled={busy} onClick={() => {
            setPatient(undefined)
            setSelected(undefined)
            setSlots(undefined)
          }}>Changer de patient</Button>
          {!filters && !error && <p role="status">Chargement des filtres…</p>}
          {filters && (
            <form className="grid gap-3" onSubmit={submitSlots}>
              <TextField id="booking-date" name="date" label="Date en Tunisie" type="date" required />
              <label>Spécialité <select name="specialtyId">
                <option value="">Toutes</option>{filters.specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>
              <label>Clinique <select name="clinicId">
                <option value="">Toutes</option>{filters.clinics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>
              <label>Praticien <select name="practitionerId">
                <option value="">Tous</option>{filters.practitioners.map((item) => (
                  <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>
                ))}
              </select></label>
              <Button disabled={busy} type="submit">Chercher les créneaux</Button>
            </form>
          )}
          {slots && search && !selected && (
            <>
              {slots.total === 0 && <p>Aucun créneau disponible.</p>}
              <ul>{slots.items.map((slot) => (
                <li key={slot.slotId}><Button onClick={() => setSelected(slot)}>
                  {dateTime.format(new Date(slot.startsAt))} · {slot.clinic.name} · {slot.practitioner.firstName} {slot.practitioner.lastName}
                </Button></li>
              ))}</ul>
              {search.page > 0 && <Button disabled={busy} onClick={() => void findSlots({ ...search, page: search.page - 1 })}>Précédent</Button>}
              {(search.page + 1) * search.size < slots.total && (
                <Button disabled={busy} onClick={() => void findSlots({ ...search, page: search.page + 1 })}>Suivant</Button>
              )}
            </>
          )}
          {selected && (
            <section aria-label="Vérification de la réservation">
              <p>{dateTime.format(new Date(selected.startsAt))} · {selected.clinic.name} · {selected.practitioner.firstName}{' '}
                {selected.practitioner.lastName}</p>
              <Button disabled={busy} onClick={() => void confirm()}>Confirmer la réservation</Button>
              <Button disabled={busy} onClick={() => setSelected(undefined)}>Choisir un autre créneau</Button>
            </section>
          )}
        </>
      )}
    </Card>
  )
}
