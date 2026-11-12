import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth, type Role } from '@/features/auth'
import StatusBadge from '@/shared/components/StatusBadge'
import { Card, EmptyState } from '@/shared/ui'
import { SPACES } from './spaces'
import styles from './SpaceHome.module.css'

/**
 * The first page of every space (PLAN.md §4.5): a greeting, one sentence, then the parts that matter for the role
 * (spaces.ts). A part whose page exists links to it; the others say "Bientôt disponible", never fake data.
 */
export default function SpaceHome({ role }: { role: Role }) {
  const { user } = useAuth()
  const { home } = SPACES[role]
  return (
    <div className={styles.home}>
      <div className={styles.greeting}>
        <h2 className={styles.hello}>Bonjour{user ? ` ${user.firstName}` : ''}</h2>
        <p className={styles.intro}>{home.intro}</p>
      </div>
      <div className={styles.parts}>
        {home.parts.map((part) => (
          <Card key={part.title}>
            <EmptyState
              icon={part.icon}
              title={part.title}
              compact
              action={
                part.link ? (
                  <Link to={part.link.to} className={styles.open}>
                    {part.link.label}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <StatusBadge>Bientôt disponible</StatusBadge>
                )
              }
            >
              {part.text}
            </EmptyState>
          </Card>
        ))}
      </div>
    </div>
  )
}
