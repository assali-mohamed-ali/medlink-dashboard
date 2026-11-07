import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound } from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import PublicHeader from '@/shared/layout/PublicHeader'
import { Alert, Button, PageLoader, PasswordField } from '@/shared/ui'
import { changePassword } from '../api'
import PasswordRules from '../components/PasswordRules'
import { PASSWORD_RULES } from '../passwordRules'
import { roleHome } from '../roles'
import { useAuth } from '../useAuth'
import styles from './PasswordPage.module.css'

/** own: a logged-in person changes their password · forced: the login answered passwordChangeRequired (no session) */
type Mode = 'own' | 'forced'

/** Why the page sends the person to the login page: what the login page then says (its router state) */
type Exit = { passwordChanged?: true; sessionExpired?: true; stepExpired?: true }

const RULES_ID = 'password-rules'

/**
 * /mot-de-passe (MLink-89, endpoint 10). Logged in: the person's own change. Sent here by the login page after
 * `passwordChangeRequired` (router state `forced`): the new password only. Anyone else goes to the login page.
 * Either way the API ends the session, so a success always leads to the login page.
 */
export default function PasswordPage() {
  const forced = Boolean((useLocation().state as { forced?: boolean } | null)?.forced)
  const { status, user } = useAuth()
  // Set once the page is done. One redirect, carrying the reason: when the session ends at the same time (password
  // changed, or SESSION_EXPIRED), the "nobody here" redirect below must not overtake it and lose the reason.
  const [exit, setExit] = useState<Exit | null>(null)

  if (exit) return <Navigate to={paths.login} replace state={exit} />
  if (status === 'loading') return <PageLoader />
  const mode: Mode | null = status === 'authenticated' ? 'own' : forced ? 'forced' : null
  if (!mode) return <Navigate to={paths.login} replace />

  return (
    <>
      <PublicHeader variant="login" />
      <main className={`${styles.page} public-header-offset`}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <KeyRound size={26} />
          </span>
          {mode === 'forced' ? (
            <>
              <h1 className={styles.title}>Choisissez un nouveau mot de passe</h1>
              <p className={styles.lead}>
                Votre compte demande un nouveau mot de passe avant de continuer. Ensuite, vous vous reconnecterez avec
                lui.
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Changer mon mot de passe</h1>
              <p className={styles.lead}>
                Une fois le mot de passe changé, vous serez déconnecté de tous vos appareils et vous vous reconnecterez.
              </p>
            </>
          )}
          {/* The e-mail rule needs the address: known when logged in, left to the server in the forced step */}
          <PasswordForm mode={mode} email={user?.email ?? ''} onExit={setExit} />
          {mode === 'own' && user && (
            <Link className={styles.back} to={roleHome(user.roles)}>
              Retour à mon espace
            </Link>
          )}
        </div>
      </main>
    </>
  )
}

function schemaFor(mode: Mode, email: string) {
  const rules = email ? PASSWORD_RULES : PASSWORD_RULES.filter((rule) => rule.id !== 'notEmail')
  return {
    rules,
    schema: z
      .object({
        // One shape for both modes: the current password is required only for the own change (refine below)
        currentPassword: z.string().optional(),
        newPassword: z
          .string()
          .refine((value) => rules.every((rule) => rule.test(value, email)), {
            message: 'Le mot de passe ne respecte pas toutes les règles.',
          }),
        confirmPassword: z.string(),
      })
      .refine((values) => mode !== 'own' || Boolean(values.currentPassword), {
        path: ['currentPassword'],
        message: 'Saisissez votre mot de passe actuel.',
      })
      .refine((values) => values.newPassword === values.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Les deux mots de passe ne sont pas identiques.',
      }),
  }
}

type PasswordValues = { currentPassword?: string; newPassword: string; confirmPassword: string }

type PasswordFormProps = { mode: Mode; email: string; onExit: (exit: Exit) => void }

function PasswordForm({ mode, email, onExit }: PasswordFormProps) {
  const { endSession } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [{ rules, schema }] = useState(() => schemaFor(mode, email))

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(schema) })
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? ''

  async function onSubmit(values: PasswordValues) {
    setFormError(null)
    try {
      await changePassword(
        mode === 'own'
          ? { currentPassword: values.currentPassword, newPassword: values.newPassword }
          : { newPassword: values.newPassword },
      )
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError(messageFor(error))
        return
      }
      switch (error.code) {
        case 'SESSION_EXPIRED': // staff forced a reset meanwhile: this session is over
          onExit({ sessionExpired: true })
          return
        case 'UNAUTHORIZED': // the forced step's 5 minutes are over
          onExit({ stepExpired: true })
          return
        case 'INVALID_CURRENT_PASSWORD':
          setError('currentPassword', { message: error.message })
          return
        case 'PASSWORD_POLICY': {
          // Keycloak's rule, in French: it wins over the checklist. The API puts it under "password".
          const { password } = fieldErrors(error.details, ['password'] as const)
          setError('newPassword', { message: password ?? error.message })
          return
        }
        case 'VALIDATION_FAILED': {
          const fields = fieldErrors(error.details, ['currentPassword', 'newPassword'] as const)
          if (fields.currentPassword) setError('currentPassword', { message: fields.currentPassword })
          if (fields.newPassword) setError('newPassword', { message: fields.newPassword })
          if (!fields.currentPassword && !fields.newPassword) setFormError(messageFor(error))
          return
        }
        default:
          setFormError(messageFor(error))
          return
      }
    }
    // The API ended the session (own change): clear it here too, so the login page (guest only) opens instead of
    // sending a still-"logged-in" person back to their space. Same render as the exit, so no "expired" notice.
    if (mode === 'own') endSession()
    onExit({ passwordChanged: true })
  }

  return (
    <form className={styles.stack} onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}

      {mode === 'own' && (
        <PasswordField
          label="Mot de passe actuel"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
      )}

      <PasswordField
        label="Nouveau mot de passe"
        autoComplete="new-password"
        aria-describedby={RULES_ID}
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <PasswordRules id={RULES_ID} rules={rules} password={newPassword} email={email} />

      <PasswordField
        label="Confirmez le nouveau mot de passe"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" fullWidth loading={isSubmitting}>
        {mode === 'forced' ? 'Enregistrer le mot de passe' : 'Changer le mot de passe'}
      </Button>
    </form>
  )
}
