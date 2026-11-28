import { useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import MedLinkShell from '@/shared/layout/MedLinkShell'
import PublicHeader from '@/shared/layout/PublicHeader'
import { Button, PasswordField, TextField } from '@/shared/ui'
import { requestPasswordReset, resetPassword } from '../api'
import { PASSWORD_RULES } from '../passwordRules'
import './SignupPage.css'

export default function RecoveryPage() {
  const reset = useLocation().pathname === paths.resetPassword
  const [query] = useSearchParams()
  const token = query.get('token')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const password = String(fields.get('password') ?? '')
    if (reset && (!PASSWORD_RULES.filter((rule) => rule.id !== "notEmail").every((rule) => rule.test(password, "")) || password !== fields.get('confirmation'))) {
      setError('Choisissez un mot de passe conforme aux règles et saisissez-le deux fois à l’identique.')
      return
    }

    setBusy(true)
    setError('')
    try {
      if (reset && token) await resetPassword(token, password)
      else await requestPasswordReset(String(fields.get('email')).trim())
      if (reset) window.history.replaceState(window.history.state, '', paths.resetPassword)
      setSuccess(true)
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PublicHeader variant="signup" />
      <MedLinkShell centered className="public-header-offset">
        <section className="signup__card signup__form">
          <h1>{reset ? 'Choisir un nouveau mot de passe' : 'Mot de passe oublié'}</h1>
          {error && <p role="alert">{error}</p>}
          {success ? (
            <p role="status">{reset ? 'Votre mot de passe a été modifié.' :
              'Si un compte éligible correspond à cette adresse, vous recevrez un lien par e-mail.'}</p>
          ) : reset && !token ? (
            <p role="alert">Lien incomplet. <Link to={paths.forgotPassword}>Demander un nouveau lien</Link></p>
          ) : (
            <form className="signup__form" onSubmit={submit}>
              {reset ? (
                <>
                  <PasswordField id="recovery-password" label="Nouveau mot de passe" name="password"
                    autoComplete="new-password" required maxLength={128} />
                  <PasswordField id="recovery-confirmation" label="Confirmer le mot de passe" name="confirmation"
                    autoComplete="new-password" required maxLength={128} />
                </>
              ) : (
                <TextField id="recovery-email" label="Adresse e-mail" name="email" type="email"
                  autoComplete="email" required />
              )}
              <Button type="submit" disabled={busy}>{reset ? 'Modifier le mot de passe' : 'Demander un lien'}</Button>
            </form>
          )}
          <Link to={paths.login}>Retour à la connexion</Link>
        </section>
      </MedLinkShell>
    </>
  )
}
