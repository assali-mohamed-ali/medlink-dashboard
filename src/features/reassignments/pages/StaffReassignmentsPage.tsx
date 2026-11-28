import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Select, WorkflowSteps } from '@/shared/ui'
import { messageFor } from '@/shared/api/errors'
import { createProposal, fetchCandidates, fetchPractitioners, fetchProposals, fetchTargets } from '../api'
import { PageNav, ProposalDetails, slotLabel } from '../components'
import type { Candidate, Page, Practitioner, Proposal, SlotRef } from '../types'
import styles from './StaffReassignmentsPage.module.css'

export default function StaffReassignmentsPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>()
  const [practitioner, setPractitioner] = useState('')
  const [clinic, setClinic] = useState('')
  const [candidates, setCandidates] = useState<Page<Candidate>>()
  const [appointment, setAppointment] = useState('')
  const [targets, setTargets] = useState<Page<SlotRef>>()
  const [target, setTarget] = useState('')
  const [proposals, setProposals] = useState<Page<Proposal>>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)

  useEffect(() => {
    let current = true
    Promise.all([fetchPractitioners(), fetchProposals('staff')]).then(
      ([people, list]) => { if (current) { setPractitioners(people); setProposals(list) } },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function run(operation: () => Promise<void>) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try { await operation() }
    catch (cause) { setError(messageFor(cause)) }
    finally { locked.current = false; setBusy(false) }
  }

  function resetCandidates() {
    setCandidates(undefined)
    setAppointment('')
    setTargets(undefined)
    setTarget('')
  }

  function search(page = 0) {
    return run(async () => {
      const result = await fetchCandidates(practitioner, clinic, page)
      setCandidates(result)
      setAppointment('')
      setTargets(undefined)
      setTarget('')
    })
  }

  function searchTargets(page = 0) {
    return run(async () => {
      const result = await fetchTargets(appointment, page)
      setTargets(result)
      setTarget('')
    })
  }

  function submit() {
    return run(async () => {
      const created = await createProposal(appointment, target)
      setProposals((previous) => ({
        items: [created, ...(previous?.items.filter((item) => item.id !== created.id) ?? [])].slice(0, 20),
        page: 0, size: 20, total: (previous?.total ?? 0) + 1,
      }))
      setNotice('Proposition enregistrée. Le rendez-vous initial reste réservé.')
      setTarget('')
      setTargets(undefined)
    })
  }

  const selected = practitioners?.find((item) => item.id === practitioner)

  const chosenAppointment = candidates?.items.find(item => item.appointmentId === appointment)
  const chosenTarget = targets?.items.find(item => item.id === target)

  return (
    <section className={styles.workspace} data-width="wide">
    <header><h2>Réaffectations de rendez-vous</h2><p>Organisez les transferts et suivez les accords sans libérer le rendez-vous initial.</p></header>
    <div className={styles.page}>
    <Card title="Nouvelle proposition" headingLevel={3}>
      <WorkflowSteps steps={['Praticien et clinique', 'Rendez-vous', 'Nouveau créneau', 'Vérification']} current={chosenTarget ? 3 : targets ? 2 : candidates ? 1 : 0} />
      <p>Choisissez un rendez-vous futur et un créneau libre d’un autre praticien de la même clinique.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {!practitioners && !error && <p role="status">Chargement des praticiens…</p>}
      <div className={styles.filters}>
      <Select label="Praticien à réaffecter" value={practitioner} disabled={busy} onChange={(event) => {
        setPractitioner(event.target.value); setClinic(''); resetCandidates()
      }}>
        <option value="">Choisir un praticien</option>
        {practitioners?.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
      </Select>
      <Select label="Clinique" value={clinic} disabled={busy || !selected} onChange={(event) => {
        setClinic(event.target.value); resetCandidates()
      }}>
        <option value="">Choisir une clinique</option>
        {selected?.clinics.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
      </Select>
      </div>
      <Button disabled={busy || !practitioner || !clinic} onClick={() => void search()}>Rechercher les rendez-vous</Button>
      {candidates && (
        <>
          {candidates.items.length === 0 && <p>Aucun rendez-vous futur pour cette affectation.</p>}
          <section className={styles.stepPanel}><h3>Rendez-vous initial</h3><Select label="Rendez-vous à transférer" value={appointment} disabled={busy} onChange={(event) => {
            setAppointment(event.target.value); setTargets(undefined); setTarget('')
          }}>
            <option value="">Choisir un rendez-vous</option>
            {candidates.items.map((item) => <option key={item.appointmentId} value={item.appointmentId}>
              {item.patientFirstName} {item.patientLastName} · {slotLabel(item.original)}
            </option>)}
          </Select>
          <PageNav label="Pages de rendez-vous" value={candidates} disabled={busy} onPage={(page) => void search(page)} />
          <Button disabled={busy || !appointment} onClick={() => void searchTargets()}>Rechercher les créneaux repreneurs</Button></section>
        </>
      )}
      {targets && (
        <>
          {targets.items.length === 0 && <p>Aucun créneau repreneur disponible.</p>}
          <section className={styles.stepPanel}><h3>Créneau de reprise</h3><Select label="Créneau repreneur" value={target} disabled={busy} onChange={(event) => setTarget(event.target.value)}>
            <option value="">Choisir un créneau</option>
            {targets.items.map((item) => <option key={item.id} value={item.id}>{slotLabel(item)}</option>)}
          </Select>
          <PageNav label="Pages de créneaux" value={targets} disabled={busy} onPage={(page) => void searchTargets(page)} />
          {chosenAppointment && chosenTarget && <section className={styles.review} aria-label="Vérification de la proposition">
            <h3>Avant de proposer</h3>
            <dl><div><dt>Rendez-vous initial</dt><dd>{slotLabel(chosenAppointment.original)}</dd></div>
            <div><dt>Nouveau créneau</dt><dd>{slotLabel(chosenTarget)}</dd></div></dl>
            <p>Le rendez-vous initial reste réservé jusqu’à l’acceptation du patient et du praticien repreneur, sous réserve de disponibilité.</p>
          </section>}
          <Button disabled={busy || !target || !appointment} onClick={() => void submit()}>Proposer la réaffectation</Button></section>
        </>
      )}
    </Card>
      <Card title="Suivi des propositions">
        <Button variant="secondary" disabled={busy} onClick={() => void run(async () => setProposals(await fetchProposals('staff')))}>Actualiser le suivi</Button>
        {proposals?.items.length === 0 && <p>Aucune proposition.</p>}
        {proposals && <ul className={styles.followup} aria-label="Suivi des réaffectations">{proposals.items.map((proposal) => <li key={proposal.id}><ProposalDetails proposal={proposal} /></li>)}</ul>}
        {proposals && <PageNav label="Pages du suivi" value={proposals} disabled={busy} onPage={(page) => void run(async () => setProposals(await fetchProposals('staff', page)))} />}
      </Card>
    </div></section>
  )
}
