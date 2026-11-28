import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import styles from '@/shared/components/StatusPage.module.css'
import { reportError } from '@/shared/lib/errorReporting'

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
    <main className={styles.page} data-standalone>
      <div className={styles.card}>
        <h1 className={styles.title}>Une erreur est survenue</h1>
        <p className={styles.text}>La page n’a pas pu s’afficher. Réessayez dans un instant.</p>
        <Link className={styles.action} to={paths.home}>Retour à l'accueil</Link>
      </div>
    </main>
  )
}
