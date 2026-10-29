import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, PageLoader } from '@/shared/ui'
import { setupMfa } from '../api'
import CodeForm from '../components/CodeForm'
import type { MfaSetup } from '../types'
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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(
    () =>
      searchParams.get('token') ??
      (location.state as { setupToken?: string } | null)?.setupToken ??
      null,
  )
  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [problem, setProblem] = useState<unknown>(null)
  const request = useRef<Promise<MfaSetup> | null>(null)

  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!token) return
    let active = true
    // One request even when React runs this effect twice (StrictMode): every run waits for the same one
    request.current ??= setupMfa(token)
    request.current.then(
      (answer) => {
        if (active) setSetup(answer)
      },
      (error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
          // The 5-minute step after the password is over: log in again, then come back with the same token
          navigate(paths.login, { replace: true, state: { setupToken: token } })
          return
        }
        setProblem(error)
      },
    )
    return () => {
      active = false
    }
  }, [token, navigate])

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
  } else if (problem) {
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
