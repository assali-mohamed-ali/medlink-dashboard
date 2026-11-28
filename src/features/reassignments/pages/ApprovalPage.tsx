import styles from '@/shared/ui/WorkflowPage.module.css'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { Alert, Button, Card } from '@/shared/ui'
import { messageFor } from '@/shared/api/errors'
import { decideProposal, fetchProposals } from '../api'
import { PageNav, ProposalDetails } from '../components'
import type { Page, Party, Proposal } from '../types'

export default function ApprovalPage({ party }: { party: Party }) {
  const [page, setPage] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<Page<Proposal>>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState<{ id: string; accepted: boolean }>()
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)

  useEffect(() => {
    let current = true
    fetchProposals(party, page).then(
      (result) => { if (current) { setData(result); setError('') } },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [party, page, attempt])

  async function submit() {
    if (!decision || locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await decideProposal(party, decision.id, decision.accepted)
      setData((old) => old && ({ ...old, items: old.items.map((item) => item.id === updated.id ? updated : item) }))
      setDecision(undefined)
      setNotice('Décision enregistrée.')
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      locked.current = false
      setBusy(false)
    }
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.pageHeading}><div><h2>Propositions de réaffectation</h2><p>{party === 'patient' ? 'Examinez les nouveaux créneaux proposés pour vos consultations.' : 'Examinez les consultations que vous êtes invité à reprendre.'}</p></div><Link className={styles.outlineLink} to={party === 'patient' ? paths.patient.appointments : paths.practitioner.agenda}>{party === 'patient' ? 'Mes rendez-vous' : 'Mon agenda'}</Link></header>
      <Card title="Propositions reçues" headingLevel={3}>
      <div className={styles.feedback}><p>Le transfert nécessite l’accord du patient et du praticien repreneur. Le rendez-vous initial reste inchangé jusque-là.</p></div>
      {error && <><Alert tone="error">{error}</Alert><Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Actualiser</Button></>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {!data && !error && <p role="status">Chargement des propositions…</p>}
      {data?.items.length === 0 && <p>Aucune proposition.</p>}
      {data && <ul className={styles.proposals} aria-label="Propositions">{data.items.map((proposal) => {
        const alreadyAccepted = party === 'patient' ? proposal.patientAccepted : proposal.practitionerAccepted
        return (
          <li key={proposal.id}>
            <Card>
              <ProposalDetails proposal={proposal} />
              {proposal.status === 'PENDING' && !alreadyAccepted && (
                <>
                  <Button disabled={busy} onClick={() => setDecision({ id: proposal.id, accepted: true })}>Accepter la proposition</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => setDecision({ id: proposal.id, accepted: false })}>Refuser la proposition</Button>
                  {decision?.id === proposal.id && (
                    <div className={styles.impact}>
                      <p>Confirmer votre décision ?</p>
                      <Button loading={busy} onClick={() => void submit()}>{decision.accepted ? 'Confirmer l’acceptation' : 'Confirmer le refus'}</Button>
                      <Button variant="secondary" disabled={busy} onClick={() => setDecision(undefined)}>Revenir</Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </li>
        )
      })}</ul>}
      {data && <PageNav label="Pages de propositions" value={data} disabled={busy} onPage={(next) => { setDecision(undefined); setPage(next) }} />}
      </Card>
    </section>
  )
}
