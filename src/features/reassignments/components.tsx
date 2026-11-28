import styles from './ProposalDetails.module.css'
import { Button } from '@/shared/ui'
import type { Page, Proposal, SlotRef } from './types'

const tunis = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Tunis' })

export function slotLabel(slot: SlotRef) {
  return `Dr ${slot.firstName} ${slot.lastName} · ${slot.clinicName} · ${tunis.format(new Date(slot.startsAt))} – ${tunis.format(new Date(slot.endsAt))}`
}

const STATUS = {
  PENDING: 'En attente des accords',
  DONE: 'Réaffectation effectuée',
  DECLINED: 'Proposition refusée',
  FAILED: 'Transfert impossible — rendez-vous initial conservé',
} as const

export function ProposalDetails({ proposal }: { proposal: Proposal }) {
  return (
    <div className={styles.proposal}>
      <p className={styles.status} data-status={proposal.status}>{STATUS[proposal.status]}</p>
      <div className={styles.comparison}>
        <section><p><strong>Rendez-vous initial :</strong> {slotLabel(proposal.original)}</p></section>
        <section><p><strong>Créneau proposé :</strong> {slotLabel(proposal.target)}</p></section>
      </div>
      <p className={styles.approvals}>Patient : {proposal.patientAccepted ? 'accord donné' : 'accord non donné'} · Praticien : {proposal.practitionerAccepted ? 'accord donné' : 'accord non donné'}</p>
    </div>
  )
}

export function PageNav<T>({ value, label, onPage, disabled = false }: {
  value: Page<T>; label: string; onPage: (page: number) => void; disabled?: boolean
}) {
  const count = Math.max(1, Math.ceil(value.total / value.size))
  if (count <= 1) return null
  return (
    <nav aria-label={label}>
      <Button variant="secondary" disabled={disabled || value.page === 0} onClick={() => onPage(value.page - 1)}>Précédent</Button>
      <span> Page {value.page + 1} sur {count} </span>
      <Button variant="secondary" disabled={disabled || value.page + 1 >= count} onClick={() => onPage(value.page + 1)}>Suivant</Button>
    </nav>
  )
}
