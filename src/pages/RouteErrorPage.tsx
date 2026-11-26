import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { reportError } from '@/shared/lib/errorReporting'
import StatusPage from '@/shared/components/StatusPage'

/**
 * The router's errorElement: a page crashed or failed to load (e.g. a lazy chunk after a new deployment).
 * It never shows the error: no stack, no message, nothing an attacker or a patient should read.
 * React Router catches route errors in production, so report them here before rendering the friendly page.
 */
export default function RouteErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    if (error) reportError(error)
  }, [error])

  return (
    <StatusPage title="Une erreur est survenue" action={{ label: "Retour à l'accueil", to: paths.home }}>
      <p>La page n’a pas pu s’afficher. Réessayez dans un instant.</p>
    </StatusPage>
  )
}
