import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import PublicHeader from '@/shared/layout/PublicHeader'
import { PageLoader } from '@/shared/ui'
import PasswordForm from '../components/PasswordForm'
import { rolePasswordPage } from '../roles'
import { useAuth } from '../useAuth'
import styles from './PasswordPage.module.css'

/** Why the page sends the person to the login page: what the login page then says (its router state) */
type Exit = { passwordChanged?: true; stepExpired?: true }

/**
 * /mot-de-passe (MLink-89, endpoint 10): the forced change, sent here by the login page after
 * `passwordChangeRequired` (router state `forced`, no session yet): the new password only, then the login page.
 * A logged-in person changes their password inside their space (OwnPasswordPage), so they go there; anyone else
 * goes to the login page.
 */
export default function PasswordPage() {
  const forced = Boolean((useLocation().state as { forced?: boolean } | null)?.forced)
  const { status, user } = useAuth()
  // Set once the step is done: one redirect, carrying the reason the login page shows
  const [exit, setExit] = useState<Exit | null>(null)

  if (exit) return <Navigate to={paths.login} replace state={exit} />
  if (status === 'loading') return <PageLoader />
  if (user) return <Navigate to={rolePasswordPage(user.roles)} replace />
  if (!forced) return <Navigate to={paths.login} replace />

  return (
    <>
      <PublicHeader variant="login" />
      <main className={`${styles.page} public-header-offset`}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <KeyRound size={26} />
          </span>
          <h1 className={styles.title}>Choisissez un nouveau mot de passe</h1>
          <p className={styles.lead}>
            Votre compte demande un nouveau mot de passe avant de continuer. Ensuite, vous vous reconnecterez avec lui.
          </p>
          <PasswordForm
            mode="forced"
            email=""
            onChanged={() => setExit({ passwordChanged: true })}
            onStepExpired={() => setExit({ stepExpired: true })}
          />
        </div>
      </main>
    </>
  )
}
