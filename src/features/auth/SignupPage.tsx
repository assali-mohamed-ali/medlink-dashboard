import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Check,
  Eye,
  EyeOff,
  Home,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { ApiError } from '../../services/apiClient'
import { fetchCsrf, register as registerRequest } from './authService'
import {
  allPasswordRulesPass,
  evaluatePasswordRules,
} from './passwordRules'
import './SignupPage.css'

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Saisissez votre adresse e-mail.')
    .email('Saisissez une adresse e-mail valide.'),
  password: z.string().min(1, 'Saisissez un mot de passe.'),
  firstName: z.string().trim().min(1, 'Saisissez votre prénom.'),
  lastName: z.string().trim().min(1, 'Saisissez votre nom.'),
  birthDate: z.string().min(1, 'Saisissez votre date de naissance.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Saisissez votre numéro de téléphone.')
    .max(30, 'Le numéro de téléphone est trop long.')
    .regex(
      /^\+?[0-9 ]*$/,
      'Le numéro ne peut contenir que des chiffres, des espaces et un + au début.',
    ),
  address: z.string().trim().min(1, 'Saisissez votre adresse.'),
})

type SignupValues = z.infer<typeof signupSchema>

type FieldErrors = Partial<Record<keyof SignupValues, string>>

function fieldErrorsFromApi(details: unknown): FieldErrors {
  if (!details || typeof details !== 'object') return {}
  const out: FieldErrors = {}
  const fields = [
    'email',
    'password',
    'firstName',
    'lastName',
    'birthDate',
    'phone',
    'address',
  ] as const
  for (const field of fields) {
    const value = (details as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) out[field] = value
  }
  return out
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      phone: '',
      address: '',
    },
    mode: 'onSubmit',
  })

  const email = watch('email')
  const password = watch('password')

  const ruleStates = useMemo(
    () => evaluatePasswordRules(password ?? '', email ?? ''),
    [password, email],
  )
  const passwordOk = useMemo(
    () => allPasswordRulesPass(password ?? '', email ?? ''),
    [password, email],
  )

  useEffect(() => {
    fetchCsrf().catch(() => {})
  }, [])

  async function onSubmit(values: SignupValues) {
    setFormError(null)
    setFieldErrors({})

    if (!allPasswordRulesPass(values.password, values.email)) {
      setFormError('Le mot de passe ne respecte pas toutes les règles requises.')
      return
    }

    try {
      await registerRequest({
        email: values.email.trim(),
        password: values.password,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        birthDate: values.birthDate,
        phone: values.phone.trim(),
        address: values.address.trim(),
      })
      setSubmittedEmail(values.email.trim())
      setSuccess(true)
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('Impossible de joindre le serveur. Veuillez réessayer.')
        return
      }

      if (error.status === 400) {
        if (error.code === 'PASSWORD_POLICY') {
          setFieldErrors({ password: error.message })
          return
        }
        const fromServer = fieldErrorsFromApi(error.details)
        setFieldErrors(fromServer)
        // No field to attach the message to: show it in the banner.
        if (Object.keys(fromServer).length === 0) setFormError(error.message)
        return
      }

      setFormError(error.message || 'Une erreur est survenue. Veuillez réessayer.')
    }
  }

  function fieldMessage(name: keyof SignupValues) {
    return fieldErrors[name] || errors[name]?.message
  }

  if (success) {
    return (
      <main className="signup">
        <div className="signup__card signup__card--success">
          <div className="signup__brand">
            <span className="signup__logo" aria-hidden="true">
              <Plus size={24} strokeWidth={3} />
            </span>
            <span>
              <strong>MedLink</strong> <span>Santé</span>
            </span>
          </div>
          <div className="signup__success-icon" aria-hidden="true">
            <Mail size={32} />
          </div>
          <h1 className="signup__title">Vérifiez votre boîte mail</h1>
          <p className="signup__subtitle">
            Un lien d&apos;activation a été envoyé
            {submittedEmail ? (
              <>
                {' '}
                à <strong>{submittedEmail}</strong>
              </>
            ) : null}
            . Ouvrez-le pour activer votre compte patient.
          </p>
          <p className="signup__hint">
            Vous ne trouvez pas le message ? Vérifiez vos spams ou dossier
            indésirables.
          </p>
          <Link to="/connexion" className="signup__submit">
            Retour à la connexion
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="signup">
      <div className="signup__card">
        <div className="signup__brand">
          <span className="signup__logo" aria-hidden="true">
            <Plus size={24} strokeWidth={3} />
          </span>
          <span>
            <strong>MedLink</strong> <span>Santé</span>
          </span>
        </div>

        <h1 className="signup__title">Créer un compte patient</h1>
        <p className="signup__subtitle">
          Inscription gratuite en quelques minutes
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && (
            <p className="signup__form-error" role="alert">
              {formError}
            </p>
          )}

          <div className="signup__row">
            <div className="signup__field">
              <label className="signup__label" htmlFor="firstName">
                <User size={18} aria-hidden="true" />
                Prénom
              </label>
              <input
                id="firstName"
                className="signup__input"
                autoComplete="given-name"
                aria-invalid={fieldMessage('firstName') ? 'true' : 'false'}
                aria-describedby={
                  fieldMessage('firstName') ? 'firstName-error' : undefined
                }
                {...register('firstName')}
              />
              {fieldMessage('firstName') && (
                <p id="firstName-error" className="signup__field-error" role="alert">
                  {fieldMessage('firstName')}
                </p>
              )}
            </div>

            <div className="signup__field">
              <label className="signup__label" htmlFor="lastName">
                <User size={18} aria-hidden="true" />
                Nom
              </label>
              <input
                id="lastName"
                className="signup__input"
                autoComplete="family-name"
                aria-invalid={fieldMessage('lastName') ? 'true' : 'false'}
                aria-describedby={
                  fieldMessage('lastName') ? 'lastName-error' : undefined
                }
                {...register('lastName')}
              />
              {fieldMessage('lastName') && (
                <p id="lastName-error" className="signup__field-error" role="alert">
                  {fieldMessage('lastName')}
                </p>
              )}
            </div>
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="email">
              <Mail size={18} aria-hidden="true" />
              Adresse e-mail
            </label>
            <input
              id="email"
              className="signup__input"
              type="email"
              autoComplete="email"
              placeholder="prenom.nom@email.tn"
              aria-invalid={fieldMessage('email') ? 'true' : 'false'}
              aria-describedby={fieldMessage('email') ? 'email-error' : undefined}
              {...register('email')}
            />
            {fieldMessage('email') && (
              <p id="email-error" className="signup__field-error" role="alert">
                {fieldMessage('email')}
              </p>
            )}
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="password">
              <Lock size={18} aria-hidden="true" />
              Mot de passe
            </label>
            <div className="signup__input-wrap">
              <input
                id="password"
                className="signup__input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={fieldMessage('password') ? 'true' : 'false'}
                aria-describedby="password-rules password-error"
                {...register('password')}
              />
              <button
                type="button"
                className="signup__toggle"
                onClick={() => setShowPassword((v) => !v)}
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
            {fieldMessage('password') && (
              <p id="password-error" className="signup__field-error" role="alert">
                {fieldMessage('password')}
              </p>
            )}
            <ul
              id="password-rules"
              className="signup__rules"
              aria-label="Règles du mot de passe"
            >
              {ruleStates.map((rule) => (
                <li
                  key={rule.id}
                  className={
                    rule.ok ? 'signup__rule signup__rule--ok' : 'signup__rule'
                  }
                  data-testid={`rule-${rule.id}`}
                >
                  <span className="signup__rule-icon" aria-hidden="true">
                    {rule.ok ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <span>{rule.label}</span>
                  <span className="signup__sr-only">
                    {rule.ok ? ' — respectée' : ' — non respectée'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="birthDate">
              <Calendar size={18} aria-hidden="true" />
              Date de naissance
            </label>
            <input
              id="birthDate"
              className="signup__input"
              type="date"
              autoComplete="bday"
              aria-invalid={fieldMessage('birthDate') ? 'true' : 'false'}
              aria-describedby={
                fieldMessage('birthDate') ? 'birthDate-error' : undefined
              }
              {...register('birthDate')}
            />
            {fieldMessage('birthDate') && (
              <p id="birthDate-error" className="signup__field-error" role="alert">
                {fieldMessage('birthDate')}
              </p>
            )}
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="phone">
              <Phone size={18} aria-hidden="true" />
              Téléphone
            </label>
            <input
              id="phone"
              className="signup__input"
              type="tel"
              autoComplete="tel"
              placeholder="+216 XX XXX XXX"
              aria-invalid={fieldMessage('phone') ? 'true' : 'false'}
              aria-describedby={fieldMessage('phone') ? 'phone-error' : undefined}
              {...register('phone')}
            />
            {fieldMessage('phone') && (
              <p id="phone-error" className="signup__field-error" role="alert">
                {fieldMessage('phone')}
              </p>
            )}
          </div>

          <div className="signup__field">
            <label className="signup__label" htmlFor="address">
              <MapPin size={18} aria-hidden="true" />
              Adresse
            </label>
            <input
              id="address"
              className="signup__input"
              autoComplete="street-address"
              placeholder="Rue, ville"
              aria-invalid={fieldMessage('address') ? 'true' : 'false'}
              aria-describedby={
                fieldMessage('address') ? 'address-error' : undefined
              }
              {...register('address')}
            />
            {fieldMessage('address') && (
              <p id="address-error" className="signup__field-error" role="alert">
                {fieldMessage('address')}
              </p>
            )}
          </div>

          <button
            className="signup__submit"
            type="submit"
            disabled={isSubmitting || !passwordOk}
          >
            {isSubmitting ? 'Création du compte…' : 'Créer mon compte'}
          </button>
        </form>

        <div className="signup__notice">
          <span className="signup__notice-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </span>
          <p style={{ margin: 0 }}>
            <strong>Données protégées</strong>
            <span>
              Vos informations de santé sont hébergées en Tunisie et chiffrées.
            </span>
          </p>
        </div>

        <p className="signup__login">
          Déjà un compte ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>

      <p className="signup__footer">
        <Home size={14} aria-hidden="true" />
        <Link to="/">Retour à l&apos;accueil</Link>
      </p>
    </main>
  )
}
