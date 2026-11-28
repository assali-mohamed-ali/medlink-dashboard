import AuthFrame from '@/shared/layout/AuthFrame'
import { useState } from 'react'
import { UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import PublicHeader from '@/shared/layout/PublicHeader'
import { useTokenFromUrl } from '@/shared/lib/useTokenFromUrl'
import { Alert } from '@/shared/ui'
import { resendActivation } from '../api'
import PasswordForm from '../components/PasswordForm'
import ResendLinkForm from '../components/ResendLinkForm'
import styles from './VerifyEmailPage.module.css'

type Step = { kind: 'form' } | { kind: 'done' } | { kind: 'linkOver'; message: string }

/**
 * /activer-compte?token=…: the link the API mails when staff create an account (MLink-71, endpoint 14). The new
 * staff member chooses their first password, with the same rules as everywhere; no e-mail is asked, the token says
 * whose account it is. A bad, old or used link offers a new one (endpoint 15). The token leaves the address bar
 * at once and lives in memory only.
 */
export default function ActivateAccountPage() {
  const token = useTokenFromUrl()
  const [step, setStep] = useState<Step>(() =>
    token ? { kind: 'form' } : { kind: 'linkOver', message: 'Ouvrez le lien reçu par e-mail pour activer votre compte.' },
  )

  let content
  if (step.kind === 'done') {
    content = (
      <>
        <Alert tone="success">Votre compte est activé.</Alert>
        <p className={styles.lead}>
          Connectez-vous avec votre adresse e-mail et ce mot de passe. À la première connexion, vous configurerez votre
          code à 6 chiffres.
        </p>
        <Link className={styles.link} to={paths.login}>
          Se connecter
        </Link>
      </>
    )
  } else if (step.kind === 'linkOver') {
    content = (
      <>
        <Alert tone="error">{step.message}</Alert>
        <p className={styles.lead}>Recevez un nouveau lien d’activation (valable 24 heures) :</p>
        <ResendLinkForm
          send={resendActivation}
          fallback="Si un compte en attente d'activation existe pour cet e-mail, un nouveau lien a été envoyé."
        />
        <Link className={styles.link} to={paths.login}>
          Se connecter
        </Link>
      </>
    )
  } else {
    content = (
      <>
        <p className={styles.lead}>Choisissez le mot de passe de votre compte MedLink.</p>
        <PasswordForm
          mode="activation"
          email=""
          token={token ?? ''}
          onChanged={() => setStep({ kind: 'done' })}
          onLinkInvalid={(error) => setStep({ kind: 'linkOver', message: messageFor(error) })}
        />
      </>
    )
  }

  return (
    <>
      <PublicHeader variant="login" />
      <AuthFrame context="Activation du compte" description="Choisissez votre mot de passe pour activer votre accès professionnel." header>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <UserRoundCheck size={28} />
          </span>
          <h1 className={styles.title}>Activez votre compte</h1>
          <div className={styles.stack}>{content}</div>
        </div>
      </AuthFrame>
    </>
  )
}
