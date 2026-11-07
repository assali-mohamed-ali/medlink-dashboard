import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { useSingleRequest } from '@/shared/lib/useSingleRequest'
import { useTokenFromUrl } from '@/shared/lib/useTokenFromUrl'
import { Alert, PageLoader } from '@/shared/ui'
import { setupMfa } from '../api'
import CodeForm from '../components/CodeForm'
import styles from '../mfa.module.css'

// Only an inline PNG is shown: a QR code is never loaded from an address the answer would name
const QR_PREFIX = 'data:image/png;base64,'

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP": easier to type by hand. */
function groupByFour(secret: string) {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret
}

/**
 * /configurer-code?token=…: the page the API mails at the first login of a practitioner or staff member
 * (MLink-64). The token leaves the address bar at once (history, screenshots, shared screens) and lives
 * in memory only. Setup is called once: a second call would replace the secret behind the QR code.
 */
export default function ConfigureCodePage() {
  const navigate = useNavigate()
  const fromLogin = (useLocation().state as { setupToken?: string } | null)?.setupToken
  const token = useTokenFromUrl(fromLogin)
  const request = useSingleRequest(setupMfa, token)
  const setup = request.status === 'done' ? request.data : null
  const problem = request.status === 'failed' ? request.error : null
  const stepExpired = problem instanceof ApiError && problem.code === 'UNAUTHORIZED'

  useEffect(() => {
    // The 5-minute step after the password is over: log in again, then come back with the same token
    if (stepExpired) navigate(paths.login, { replace: true, state: { setupToken: token } })
  }, [stepExpired, token, navigate])

  let content
  if (!token) {
    content = (
      <>
        <Alert tone="error">
          Ouvrez le lien reçu par e-mail pour configurer votre application (il est valable 30 minutes).
        </Alert>
        <Link className={styles.link} to={paths.login}>
          Se reconnecter
        </Link>
      </>
    )
  } else if (problem instanceof ApiError && problem.code === 'MFA_ALREADY_ENROLLED') {
    content = (
      <>
        <Alert tone="info">Votre application est déjà configurée.</Alert>
        <Link className={styles.link} to={paths.mfa}>
          Saisir mon code
        </Link>
      </>
    )
  } else if (problem && !stepExpired) {
    content = (
      <>
        <Alert tone="error">{messageFor(problem)}</Alert>
        <Link className={styles.link} to={paths.login}>
          Se reconnecter
        </Link>
      </>
    )
  } else if (!setup) {
    content = <PageLoader label="Préparation de votre QR code…" />
  } else {
    content = (
      <>
        <ol className={styles.steps}>
          <li>Ouvrez Google Authenticator, Microsoft Authenticator ou FreeOTP.</li>
          <li>Scannez ce QR code (ou saisissez la clé ci-dessous).</li>
          <li>Saisissez le code à 6 chiffres affiché par l’application.</li>
        </ol>
        {setup.qrCode.startsWith(QR_PREFIX) && (
          <img
            className={styles.qr}
            src={setup.qrCode}
            width={200}
            height={200}
            alt="QR code à scanner avec votre application d’authentification"
          />
        )}
        <p className={styles.keyLabel}>Clé à saisir à la main :</p>
        <p className={styles.key}>{groupByFour(setup.secret)}</p>
        <CodeForm />
      </>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Configurez votre application</h1>
        <div className={styles.stack}>{content}</div>
      </div>
    </main>
  )
}
