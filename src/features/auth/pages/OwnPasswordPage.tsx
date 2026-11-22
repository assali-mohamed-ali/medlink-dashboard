import { KeyRound } from 'lucide-react'
import PasswordForm from '../components/PasswordForm'
import { useAuth } from '../useAuth'
import styles from './PasswordPage.module.css'

/**
 * The own password change (MLink-89, endpoint 10), a page of each space (`/patient|/praticien|/admin/mot-de-passe`):
 * the space's menu, title and logout stay around it. The space's guard has checked the role. On success the API
 * ends every session of the person: `endSession` clears it here too, and the guard opens the login page, which
 * says the password changed (code owner's review on #11: a public page made the person look logged out).
 */
export default function OwnPasswordPage() {
  const { user, endSession } = useAuth()

  return (
    <section className={`${styles.card} ${styles.inSpace}`} aria-labelledby="own-password-title">
      <span className={styles.icon} aria-hidden="true">
        <KeyRound size={26} />
      </span>
      <h2 id="own-password-title" className={styles.title}>
        Changer mon mot de passe
      </h2>
      <p className={styles.lead}>
        Une fois le mot de passe changé, vous serez déconnecté de tous vos appareils et vous vous reconnecterez.
      </p>
      <PasswordForm mode="own" email={user?.email ?? ''} onChanged={endSession} />
    </section>
  )
}
