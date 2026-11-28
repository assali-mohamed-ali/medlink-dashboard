import { ArrowLeft, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import PasswordForm from '../components/PasswordForm'
import { useAuth } from '../useAuth'
import styles from './PasswordPage.module.css'

/**
 * The own password change (MLink-89, endpoint 10), a page of each space (`/patient|/praticien|/admin/mot-de-passe`):
 * the space's menu, title and logout stay around it. The space's guard has checked the role. On success the API
 * ends every session of the person: `endSession` clears it here too, and the guard opens the login page, which
 * says the password changed (code owner's review on #11: a public page made the person look logged out).
 * The card sits in the middle of the screen; a practitioner or a patient, who open it from their profile, get a way
 * back to it under the button.
 */
export default function OwnPasswordPage() {
  const { user, endSession } = useAuth()
  // Every space opens it from its profile: a way back to it under the button
  const profile = user?.roles.includes('PRACTITIONER')
    ? paths.practitioner.profile
    : user?.roles.includes('PATIENT')
      ? paths.patient.profile
      : user?.roles.includes('ADMINISTRATIVE_STAFF')
        ? paths.staff.profile
        : null

  return (
    // data-width: the space gives the page its whole width, so the card sits in the middle of the screen
    <div className={styles.inSpace} data-width="wide">
      <aside className={styles.securityGuide}><h3>Protéger votre compte</h3><p>Utilisez un mot de passe unique. Le changement fermera toutes vos sessions en cours.</p><p>Vous devrez vous reconnecter avec votre nouveau mot de passe.</p></aside>
      <section className={`${styles.card} ${styles.spaceCard}`} aria-labelledby="own-password-title">
        <div className={styles.head}>
          <span className={styles.icon} aria-hidden="true">
            <KeyRound size={26} />
          </span>
          <h2 id="own-password-title" className={styles.title}>
            Changer mon mot de passe
          </h2>
          <p className={styles.lead}>
            Une fois le mot de passe changé, vous serez déconnecté de tous vos appareils et vous vous reconnecterez.
          </p>
        </div>
        <PasswordForm mode="own" email={user?.email ?? ''} onChanged={endSession} />
        {profile && (
          <Link to={profile} className={styles.back}>
            <ArrowLeft size={16} aria-hidden="true" />
            Retour au profil
          </Link>
        )}
      </section>
    </div>
  )
}
