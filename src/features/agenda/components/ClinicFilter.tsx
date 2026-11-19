import { useId } from 'react'
import { ListFilter } from 'lucide-react'
import { Checkbox } from '@/shared/ui'
import { shortName, sortedClinics } from '../clinicTones'
import type { Agenda } from '../types'
import styles from '../agenda.module.css'

type Props = {
  agenda: Agenda
  tones: ReadonlyMap<string, number>
  hidden: ReadonlySet<string>
  onToggle: (clinicId: string) => void
  onShowAll: () => void
}

/** "Filtrer par clinique" (Stitch design): one box per clinic of the practitioner, with its slots of the week. */
export default function ClinicFilter({ agenda, tones, hidden, onToggle, onShowAll }: Props) {
  const titleId = useId()
  const counts = new Map<string, number>()
  for (const item of agenda.items) counts.set(item.clinic.id, (counts.get(item.clinic.id) ?? 0) + 1)

  return (
    <section aria-labelledby={titleId} className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 id={titleId} className={styles.panelTitle}>
          <ListFilter size={16} aria-hidden="true" />
          Filtrer par clinique
        </h3>
        <button type="button" className={styles.linkButton} onClick={onShowAll} disabled={hidden.size === 0}>
          Tout cocher
        </button>
      </div>
      <div className={styles.filters}>
        {sortedClinics(agenda.clinics).map((clinic) => {
          const count = counts.get(clinic.id) ?? 0
          return (
            <div key={clinic.id} className={styles.filter} data-tone={tones.get(clinic.id)}>
              <Checkbox
                checked={!hidden.has(clinic.id)}
                onChange={() => onToggle(clinic.id)}
                label={<span className={styles.filterName}>Clinique {shortName(clinic.name)}</span>}
                hint={`${count} créneau${count > 1 ? 'x' : ''}`}
              />
              <span className={styles.dot} aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </section>
  )
}
