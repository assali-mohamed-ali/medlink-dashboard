import { useLocation } from 'react-router-dom'
import CodeForm from '../components/CodeForm'
import styles from '../mfa.module.css'

/**
 * /double-authentification: where the login sends a practitioner or staff member (MLink-64).
 * First login (`mfaSetupRequired`): the API has mailed a setup link, so this page only says to open it.
 * Then: the 6-digit code from the authenticator app.
 */
export default function MfaPage() {
  const state = useLocation().state as { mfaSetupRequired?: boolean } | null

  if (state?.mfaSetupRequired) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Configurez votre application</h1>
          <p className={styles.lead}>
            Pour protéger votre compte, ouvrez le lien envoyé à votre adresse e-mail : il affiche le QR code
            à scanner avec Google Authenticator, Microsoft Authenticator ou FreeOTP. Le lien est valable
            30 minutes et ne sert qu’une fois.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Saisissez votre code</h1>
        <p className={styles.lead}>Ouvrez votre application d’authentification et saisissez le code affiché.</p>
        <CodeForm />
      </div>
    </main>
  )
}
