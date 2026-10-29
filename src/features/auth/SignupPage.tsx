import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import {
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Headset,
  Home,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Timer,
  UserPlus,
  X,
} from 'lucide-react'
import MedLinkShell from '../../components/layout/MedLinkShell'
import PublicHeader from '../../components/layout/PublicHeader'
import { ApiError } from '../../services/apiClient'
import { fetchCsrf, register as registerRequest } from './authService'
import {
  allPasswordRulesPass,
  evaluatePasswordRules,
} from './passwordRules'
import './SignupPage.css'

const GOUVERNORATS = [
  { value: 'tunis', label: 'Tunis (Grand Tunis)' },
  { value: 'ariana', label: 'Ariana' },
  { value: 'ben-arous', label: 'Ben Arous' },
  { value: 'manouba', label: 'La Manouba' },
  { value: 'sousse', label: 'Sousse' },
  { value: 'sfax', label: 'Sfax' },
  { value: 'monastir', label: 'Monastir' },
  { value: 'nabeul', label: 'Nabeul / Cap Bon' },
  { value: 'bizerte', label: 'Bizerte' },
  { value: 'autre', label: 'Autre gouvernorat (Tunisie)' },
] as const

const CLINICS = [
  {
    id: 'tunis',
    city: 'Tunis',
    name: 'Clinique Berges du Lac',
    detail: 'Urgences 24/7 • Pôle Oncologie & Cardio',
  },
  {
    id: 'sousse',
    city: 'Sousse',
    name: 'Clinique du Kantaoui',
    detail: 'Maternité, Chirurgie & Imagerie IRM',
  },
  {
    id: 'sfax',
    city: 'Sfax',
    name: 'Polyclinique El Medina',
    detail: 'Plateau Robotisé & Centre du Dos',
  },
] as const

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
  gouvernorat: z.string().min(1, 'Sélectionnez votre gouvernorat.'),
  preferredClinic: z.string().min(1, 'Choisissez une clinique de rattachement.'),
  consent: z.boolean().refine((v) => v === true, {
    message: 'Vous devez accepter le traitement de vos données pour continuer.',
  }),
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
    control,
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
      gouvernorat: '',
      preferredClinic: '',
      consent: false,
    },
  })

  const email = useWatch({ control, name: 'email' })
  const password = useWatch({ control, name: 'password' })

  const passwordChecks = useMemo(
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

    let phone = values.phone.trim()
    if (phone && !phone.startsWith('+')) {
      phone = `+216 ${phone.replace(/^0+/, '')}`
    }

    try {
      await registerRequest({
        email: values.email.trim(),
        password: values.password,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        birthDate: values.birthDate,
        phone,
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
        if (Object.keys(fromServer).length === 0) setFormError(error.message)
        return
      }
      if (error.status === 409) {
        setFormError(
          error.message ||
            'Un dossier patient est déjà associé à cette adresse e-mail.',
        )
        return
      }
      setFormError(error.message || 'Une erreur est survenue. Veuillez réessayer.')
    }
  }

  function fieldMessage(name: keyof SignupValues) {
    return fieldErrors[name] || errors[name]?.message
  }

  /* ----- Écran succès ----- */
  if (success) {
    return (
      <>
      <PublicHeader variant="signup" />
      <MedLinkShell centered className="public-header-offset">
        <div className="signup__card signup__card--success">
          <div className="signup__brand">
            <span className="signup__logo" aria-hidden="true">
              <Plus size={22} strokeWidth={3} />
            </span>
            <span>
              <strong>MedLink</strong> <em>Santé</em>
            </span>
          </div>
          <div className="signup__success-icon" aria-hidden="true">
            <Mail size={36} />
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
          <ul className="signup__success-list">
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              Activation instantanée sans déplacement
            </li>
            <li>
              <Timer size={18} aria-hidden="true" />
              Lien actif pendant 24 heures
            </li>
            <li>
              <ShieldCheck size={18} aria-hidden="true" />
              Données hébergées en Tunisie (INPDP)
            </li>
          </ul>
          <p className="signup__hint">
            Vous ne trouvez pas le message ? Vérifiez vos spams ou dossier
            indésirables.
          </p>
          <Link to="/connexion" className="signup__submit">
            Retour à la connexion
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </MedLinkShell>
      </>
    )
  }

  /* ----- Formulaire ----- */
  const header = (
    <div className="signup__top">
      <div className="signup__hds-badge">
        <ShieldCheck size={16} aria-hidden="true" />
        Protection HDS &amp; INPDP · Chiffrement de bout en bout
      </div>
    </div>
  )

  const intro = (
    <div className="signup__intro">
      <span className="signup__badge">Espace Santé Personnel &amp; Sécurisé</span>
      <h1 className="signup__page-title">Créer votre compte patient MedLink</h1>
      <p className="signup__page-lead">
        Une seule étape pour accéder à vos rendez-vous, résultats et dossiers sur
        les trois cliniques du réseau — en toute confidentialité.
      </p>
    </div>
  )

  const footer = (
    <p className="signup__footer">
      <Home size={14} aria-hidden="true" />
      <Link to="/">Retour à l&apos;accueil</Link>
      <span aria-hidden="true">·</span>
      Réseau de cliniques MedLink · Données de santé hébergées en Tunisie
    </p>
  )

  return (
    <>
      <PublicHeader variant="signup" />
      <MedLinkShell
      className="public-header-offset"
      header={header}
      intro={intro}
      sidebar={
        <>
          <div className="signup-side__card">
            <div className="signup-side__icon" aria-hidden="true">
              <Mail size={24} />
            </div>
            <h3 className="signup-side__title">Aperçu de l&apos;étape suivante</h3>
            <p className="signup-side__text">
              Après validation, un e-mail d&apos;activation sécurisé vous sera
              adressé pour confirmer votre identité.
            </p>
            <div className="signup-side__chip">
              <Timer size={16} aria-hidden="true" />
              <div>
                <strong>Délai d&apos;activation</strong>
                <span>Lien actif pendant 24 heures</span>
              </div>
            </div>
            <ul className="signup-side__checks">
              <li>
                <CheckCircle2 size={16} aria-hidden="true" />
                Activation instantanée sans déplacement
              </li>
              <li>
                <CheckCircle2 size={16} aria-hidden="true" />
                Accès immédiat aux créneaux en ligne
              </li>
              <li>
                <CheckCircle2 size={16} aria-hidden="true" />
                Dossier synchronisé sur les 3 cliniques
              </li>
            </ul>
          </div>

          <div className="signup-side__card signup-side__card--help">
            <span className="signup-side__tag">Assistance Enrôlement</span>
            <h3 className="signup-side__title">
              Besoin d&apos;aide pour vous inscrire ?
            </h3>
            <p className="signup-side__text">
              Notre permanence d&apos;accueil vous guide pour finaliser votre
              compte patient.
            </p>
            <div className="signup-side__phone">
              <span className="signup-side__phone-icon" aria-hidden="true">
                <Headset size={20} />
              </span>
              <div>
                <strong>Ligne directe gratuite</strong>
                <a href="tel:+21671800900">+216 71 800 900</a>
              </div>
            </div>
            <div className="signup-side__hosting">
              <ShieldCheck size={16} aria-hidden="true" />
              <div>
                <strong>Garantie d&apos;hébergement HDS</strong>
                <span>
                  Vos informations médicales restent en Tunisie, chiffrées et
                  journalisées.
                </span>
              </div>
            </div>
          </div>
        </>
      }
      footer={footer}
    >
      <div className="signup__card">
        <div className="signup__card-head">
          <div className="signup__step">1</div>
          <div>
            <h2 id="signup-form-title" className="signup__card-title">
              Fiche d&apos;identification clinique
            </h2>
            <p className="signup__card-sub">
              Étape unique de création d&apos;accès patient
            </p>
          </div>
          <span className="signup__csrf-pill">
            <Lock size={12} aria-hidden="true" />
            Session protégée par CSRF
          </span>
        </div>

        <form
          className="signup__form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          aria-labelledby="signup-form-title"
        >
          {formError && (
            <div className="signup__banner signup__banner--error" role="alert">
              <Info size={20} aria-hidden="true" />
              <div>
                <strong>Impossible de créer le compte</strong>
                <p>{formError}</p>
              </div>
            </div>
          )}

          <fieldset className="signup__section">
            <legend className="signup__section-label">
              <Lock size={18} aria-hidden="true" />
              Identifiants de sécurité
            </legend>

            <div className="signup__field">
              <label className="signup__label" htmlFor="email">
                <span>
                  Adresse e-mail personnelle <span className="signup__req">*</span>
                </span>
                <span className="signup__label-hint">Identifiant unique du dossier</span>
              </label>
              <div className="signup__input-wrap">
                <Mail className="signup__input-icon" size={18} aria-hidden="true" />
                <input
                  id="email"
                  className="signup__input signup__input--icon"
                  type="email"
                  autoComplete="email"
                  placeholder="exemple.patient@domaine.tn"
                  aria-invalid={fieldMessage('email') ? 'true' : 'false'}
                  {...register('email')}
                />
              </div>
              {fieldMessage('email') && (
                <p className="signup__field-error" role="alert">
                  {fieldMessage('email')}
                </p>
              )}
            </div>

            <div className="signup__field">
              <label className="signup__label" htmlFor="password">
                <span>
                  Mot de passe maître <span className="signup__req">*</span>
                </span>
                <span className="signup__label-hint">Politique de sécurité MedLink</span>
              </label>
              <div className="signup__input-wrap">
                <Lock className="signup__input-icon" size={18} aria-hidden="true" />
                <input
                  id="password"
                  className="signup__input signup__input--icon signup__input--toggle"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Créez un mot de passe robuste"
                  aria-invalid={fieldMessage('password') ? 'true' : 'false'}
                  aria-describedby="password-rules"
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
                <p className="signup__field-error" role="alert">
                  {fieldMessage('password')}
                </p>
              )}
              <ul
                id="password-rules"
                className="signup__rules"
                aria-label="Règles du mot de passe"
              >
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.id}
                    data-testid={`rule-${rule.id}`}
                    className={rule.ok ? 'signup__rule signup__rule--ok' : 'signup__rule'}
                  >
                    {rule.ok ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <X size={14} aria-hidden="true" />
                    )}
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          </fieldset>

          <fieldset className="signup__section">
            <legend className="signup__section-label">
              <UserPlus size={18} aria-hidden="true" />
              Identité &amp; coordonnées
            </legend>

            <div className="signup__grid">
              <div className="signup__field">
                <label className="signup__label" htmlFor="firstName">
                  Prénom <span className="signup__req">*</span>
                </label>
                <input
                  id="firstName"
                  className="signup__input"
                  autoComplete="given-name"
                  placeholder="ex. Yassine"
                  aria-invalid={fieldMessage('firstName') ? 'true' : 'false'}
                  {...register('firstName')}
                />
                {fieldMessage('firstName') && (
                  <p className="signup__field-error" role="alert">
                    {fieldMessage('firstName')}
                  </p>
                )}
              </div>

              <div className="signup__field">
                <label className="signup__label" htmlFor="lastName">
                  Nom de famille <span className="signup__req">*</span>
                </label>
                <input
                  id="lastName"
                  className="signup__input"
                  autoComplete="family-name"
                  placeholder="ex. Ben Salem"
                  aria-invalid={fieldMessage('lastName') ? 'true' : 'false'}
                  {...register('lastName')}
                />
                {fieldMessage('lastName') && (
                  <p className="signup__field-error" role="alert">
                    {fieldMessage('lastName')}
                  </p>
                )}
              </div>

              <div className="signup__field">
                <label className="signup__label" htmlFor="birthDate">
                  Date de naissance <span className="signup__req">*</span>
                </label>
                <div className="signup__input-wrap">
                  <Calendar className="signup__input-icon" size={18} aria-hidden="true" />
                  <input
                    id="birthDate"
                    className="signup__input signup__input--icon"
                    type="date"
                    autoComplete="bday"
                    aria-invalid={fieldMessage('birthDate') ? 'true' : 'false'}
                    {...register('birthDate')}
                  />
                </div>
                {fieldMessage('birthDate') && (
                  <p className="signup__field-error" role="alert">
                    {fieldMessage('birthDate')}
                  </p>
                )}
              </div>

              <div className="signup__field">
                <label className="signup__label" htmlFor="phone">
                  <span>
                    Téléphone mobile <span className="signup__req">*</span>
                  </span>
                  <span className="signup__label-hint">SMS 2FA de sécurité</span>
                </label>
                <div className="signup__phone">
                  <span className="signup__phone-prefix" aria-hidden="true">
                    <Phone size={14} />
                    +216
                  </span>
                  <input
                    id="phone"
                    className="signup__input signup__input--phone"
                    type="tel"
                    autoComplete="tel-national"
                    placeholder="98 123 456"
                    aria-invalid={fieldMessage('phone') ? 'true' : 'false'}
                    {...register('phone')}
                  />
                </div>
                {fieldMessage('phone') && (
                  <p className="signup__field-error" role="alert">
                    {fieldMessage('phone')}
                  </p>
                )}
              </div>

              <div className="signup__field signup__field--full">
                <label className="signup__label" htmlFor="address">
                  Adresse de résidence principale{' '}
                  <span className="signup__req">*</span>
                </label>
                <div className="signup__input-wrap">
                  <MapPin className="signup__input-icon" size={18} aria-hidden="true" />
                  <input
                    id="address"
                    className="signup__input signup__input--icon"
                    autoComplete="street-address"
                    placeholder="Rue, numéro, quartier ou cité"
                    aria-invalid={fieldMessage('address') ? 'true' : 'false'}
                    {...register('address')}
                  />
                </div>
                {fieldMessage('address') && (
                  <p className="signup__field-error" role="alert">
                    {fieldMessage('address')}
                  </p>
                )}
              </div>

              <div className="signup__field signup__field--full">
                <label className="signup__label" htmlFor="gouvernorat">
                  Gouvernorat / Région <span className="signup__req">*</span>
                </label>
                <div className="signup__input-wrap">
                  <MapPin className="signup__input-icon" size={18} aria-hidden="true" />
                  <select
                    id="gouvernorat"
                    className="signup__input signup__input--icon signup__select"
                    aria-invalid={fieldMessage('gouvernorat') ? 'true' : 'false'}
                    {...register('gouvernorat')}
                  >
                    <option value="">Sélectionnez votre gouvernorat</option>
                    {GOUVERNORATS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldMessage('gouvernorat') && (
                  <p className="signup__field-error" role="alert">
                    {fieldMessage('gouvernorat')}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="signup__section">
            <legend className="signup__section-label">
              <Building2 size={18} aria-hidden="true" />
              Clinique MedLink de rattachement préférentiel
            </legend>
            <p className="signup__section-help">
              Votre dossier sera synchronisé sur l&apos;ensemble du réseau, mais
              votre clinique d&apos;attache coordonnera vos parcours présentiels
              d&apos;urgence et d&apos;hospitalisation.
            </p>

            <div
              className="signup__clinics"
              role="radiogroup"
              aria-label="Clinique de rattachement"
            >
              {CLINICS.map((clinic) => (
                <label key={clinic.id} className="signup__clinic">
                  <input
                    type="radio"
                    value={clinic.id}
                    className="signup__clinic-input"
                    {...register('preferredClinic')}
                  />
                  <span className="signup__clinic-body">
                    <span className="signup__clinic-top">
                      <Building2 size={18} aria-hidden="true" />
                      <strong>{clinic.city}</strong>
                    </span>
                    <span className="signup__clinic-name">{clinic.name}</span>
                    <span className="signup__clinic-detail">{clinic.detail}</span>
                  </span>
                </label>
              ))}
            </div>
            {fieldMessage('preferredClinic') && (
              <p className="signup__field-error" role="alert">
                {fieldMessage('preferredClinic')}
              </p>
            )}
          </fieldset>

          <label className="signup__consent">
            <input
              type="checkbox"
              className="signup__consent-input"
              {...register('consent')}
            />
            <span className="signup__consent-box" aria-hidden="true" />
            <span className="signup__consent-text">
              J&apos;accepte expressément le traitement de mes données personnelles
              et médicales par le réseau MedLink, conformément à la réglementation
              INPDP et à la <a href="#">politique de confidentialité</a>.{' '}
              <span className="signup__req">*</span>
            </span>
          </label>
          {fieldMessage('consent') && (
            <p className="signup__field-error" role="alert">
              {fieldMessage('consent')}
            </p>
          )}

          <div className="signup__actions">
            <p className="signup__login-link">
              Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
            </p>
            <button
              className="signup__submit"
              type="submit"
              disabled={isSubmitting || !passwordOk}
            >
              {isSubmitting ? (
                'Création du compte…'
              ) : (
                <>
                  <UserPlus size={18} aria-hidden="true" />
                  Créer mon compte patient
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </MedLinkShell>
    </>
  )
}