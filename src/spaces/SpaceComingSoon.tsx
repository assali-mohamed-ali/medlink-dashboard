import { useId } from 'react'
import { Hourglass } from 'lucide-react'
import { EmptyState } from '@/shared/ui'

/**
 * A page of a space whose feature is not built yet: its title (h2, under the space's h1) and an honest
 * "Bientôt disponible", never fake data. The feature's page replaces it in app/routes.tsx.
 */
export default function SpaceComingSoon({ title }: { title: string }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <EmptyState icon={Hourglass} title="Bientôt disponible">
        Cette page arrive dans une prochaine version de MedLink.
      </EmptyState>
    </section>
  )
}
