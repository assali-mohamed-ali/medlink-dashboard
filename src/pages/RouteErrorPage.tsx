import { paths } from '@/shared/config/paths'
import StatusPage from './StatusPage'

/**
 * The router's errorElement: a page crashed or failed to load (e.g. a lazy chunk after a new deployment).
 * It never shows the error: no stack, no message, nothing an attacker or a patient should read.
 */
export default function RouteErrorPage() {
  return (
    <StatusPage title="Une erreur est survenue" action={{ label: "Retour à l'accueil", to: paths.home }}>
      <p>La page n’a pas pu s’afficher. Réessayez dans un instant.</p>
    </StatusPage>
  )
}
