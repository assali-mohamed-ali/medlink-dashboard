import { roleHome, useAuth } from '@/features/auth'
import StatusPage from './StatusPage'

/** Where the guards send a person who opened another role's page (MLink-61). */
export default function AccessDeniedPage() {
  const { user } = useAuth()
  return (
    <StatusPage
      title="Accès refusé"
      action={{ label: 'Retour à mon espace', to: roleHome(user?.roles ?? []) }}
    >
      <p>Cette page est réservée à un autre profil que le vôtre.</p>
    </StatusPage>
  )
}
