import { MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import PublicHeader from '@/shared/layout/PublicHeader'
import { useSingleRequest } from '@/shared/lib/useSingleRequest'
import { useTokenFromUrl } from '@/shared/lib/useTokenFromUrl'
import { Alert, PageLoader } from '@/shared/ui'
import { resendVerification, verifyEmail } from '../api'
import ResendLinkForm from '../components/ResendLinkForm'
import styles from './VerifyEmailPage.module.css'

/**
 * /verifier-email?token=…: the link the API mails after signup (MLink-80, endpoint 3). Confirms the address
 * once; on a bad or old link, offers a new one (endpoint 4).
 */
export default function VerifyEmailPage() {
  const token = useTokenFromUrl()
  const verification = useSingleRequest(verifyEmail, token)

  let content
  if (verification.status === 'pending') {
    content = <PageLoader label="Vérification de votre adresse…" />
  } else if (verification.status === 'done') {
    content = (
      <>
        <Alert tone="success">Votre adresse e-mail est confirmée.</Alert>
        <Link className={styles.link} to={paths.login}>
          Se connecter
        </Link>
      </>
    )
  } else {
    content = (
      <>
        <Alert tone="error">
          {verification.status === 'failed'
            ? messageFor(verification.error)
            : 'Ouvrez le lien reçu par e-mail pour confirmer votre adresse.'}
        </Alert>
        <p className={styles.lead}>Recevez un nouveau lien (valable 24 heures) :</p>
        <ResendLinkForm
          send={resendVerification}
          fallback="Si un compte non vérifié existe pour cet e-mail, un nouveau lien a été envoyé."
        />
        <Link className={styles.link} to={paths.login}>
          Se connecter
        </Link>
      </>
    )
  }

  return (
    <>
      <PublicHeader variant="login" />
      <main className={`${styles.page} public-header-offset`}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <MailCheck size={28} />
          </span>
          <h1 className={styles.title}>Confirmation de votre adresse e-mail</h1>
          <div className={styles.stack}>{content}</div>
        </div>
      </main>
    </>
  )
}
