import { paths } from '@/shared/config/paths'
import StatusPage from '@/shared/components/StatusPage'

export default function NotFoundPage() {
  return (
    <StatusPage title="Page introuvable" action={{ label: "Retour à l'accueil", to: paths.home }}>
      <p>Cette adresse ne correspond à aucune page de MedLink.</p>
    </StatusPage>
  )
}
