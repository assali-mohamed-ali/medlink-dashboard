import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import PublicHeader from '../../components/layout/PublicHeader'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Plus, ShieldCheck } from 'lucide-react'
import { ApiError } from '../../services/apiClient'
import { fetchCsrf, resendVerification } from './authService'
import type { LoginResponse } from './authService'
import { roleHome } from './roles'
import { useAuth } from './useAuth'
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
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    // Sets the XSRF-TOKEN cookie so the login POST carries the CSRF header.
    fetchCsrf().catch(() => {})
  }, [])

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
      setShowPassword(false)
      if (error instanceof ApiError) {
        if (error.status === 403 && error.code === 'EMAIL_NOT_VERIFIED') {
          setNeedsVerification(true)
        }
        setFormError(error.message)
      } else {
        setFormError('Impossible de joindre le serveur. Veuillez réessayer.')
      }
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
      setResendMessage(
        error instanceof ApiError
          ? error.message
          : 'Une erreur est survenue. Veuillez réessayer.',
      )
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

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && (
            <p className="login__form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="login__field">
            <label className="login__label" htmlFor="email">
              <Mail size={18} aria-hidden="true" />
              Adresse e-mail
            </label>
            <input
              id="email"
              className="login__input"
              type="email"
              autoComplete="username"
              placeholder="prenom.nom@email.tn"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="login__field-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="login__field">
            <label className="login__label" htmlFor="password">
              <Lock size={18} aria-hidden="true" />
              Mot de passe
            </label>
            <div className="login__input-wrap">
              <input
                id="password"
                className="login__input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <button
                type="button"
                className="login__toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                }
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="login__field-error" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <button className="login__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              'Connexion…'
            ) : (
              <>
                Se connecter
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
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
          <p style={{ margin: 0 }}>
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