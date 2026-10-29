import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import PublicHeader from '@/shared/layout/PublicHeader'
import { ArrowRight, Lock, Mail, Plus, ShieldCheck } from 'lucide-react'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, PasswordField, TextField } from '@/shared/ui'
import { resendVerification } from '../api'
import type { LoginResponse } from '../types'
import { roleHome } from '../roles'
import { useAuth } from '../useAuth'
import './LoginPage.css'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [failedTries, setFailedTries] = useState(0)

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    setNeedsVerification(false)
    setResendMessage(null)
    setSubmittedEmail(values.email)

    let result: LoginResponse
    try {
      result = await login(values.email, values.password)
    } catch (error) {
      // The password is never kept after a submit.
      resetField('password')
      setFailedTries((tries) => tries + 1)
      if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true)
      }
      setFormError(messageFor(error))
      return
    }

    resetField('password')

    if (result.mfaRequired) {
      navigate('/double-authentification', {
        state: { mfaSetupRequired: Boolean(result.mfaSetupRequired) },
      })
    } else if (result.passwordChangeRequired) {
      navigate('/mot-de-passe', { state: { forced: true } })
    } else if (result.user) {
      // login() has already stored the user in the auth state.
      navigate(roleHome(result.user.roles))
    }
  }

  async function onResend() {
    setResendMessage(null)
    try {
      const response = await resendVerification(submittedEmail)
      setResendMessage(
        response?.message ?? 'Si le compte existe, un nouveau lien a été envoyé.',
      )
    } catch (error) {
      setResendMessage(messageFor(error))
    }
  }

  return (
    <>
      <PublicHeader variant="login" />
      <main className="login public-header-offset">
      <div className="login__card">
        <div className="login__brand">
          <span className="login__logo" aria-hidden="true">
            <Plus size={24} strokeWidth={3} />
          </span>
          <span>
            <strong>MedLink</strong> <span>Santé</span>
          </span>
        </div>

        <h1 className="login__title">Bienvenue sur MedLink</h1>
        <p className="login__subtitle">Connectez-vous à votre espace santé</p>

        <form className="login__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <Alert tone="error">{formError}</Alert>}

          <TextField
            label={
              <>
                <Mail size={18} aria-hidden="true" />
                Adresse e-mail
              </>
            }
            type="email"
            autoComplete="username"
            placeholder="prenom.nom@email.tn"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* A new key after each failed try remounts the field: the password is also hidden again */}
          <PasswordField
            key={failedTries}
            label={
              <>
                <Lock size={18} aria-hidden="true" />
                Mot de passe
              </>
            }
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" fullWidth loading={isSubmitting}>
            Se connecter
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </form>

        {needsVerification && (
          <div className="login__resend">
            <button type="button" onClick={onResend}>
              Renvoyer le lien
            </button>
            {resendMessage && <p role="status">{resendMessage}</p>}
          </div>
        )}

        <div className="login__notice">
          <span className="login__notice-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <p className="login__notice-text">
            <strong>Connexion sécurisée</strong>
            <span>
              Les praticiens et le personnel valident leur connexion avec un code à
              usage unique (TOTP).
            </span>
          </p>
        </div>

        <p className="login__signup">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </div>

      <p className="login__footer">
        Réseau de cliniques MedLink · Données de santé hébergées en Tunisie
      </p>
    </main>
    </>
  )
}
