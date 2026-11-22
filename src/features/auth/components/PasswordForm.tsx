import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'
import { Alert, Button, PasswordField } from '@/shared/ui'
import { changePassword } from '../api'
import { PASSWORD_RULES } from '../passwordRules'
import PasswordRules from './PasswordRules'
import styles from './PasswordForm.module.css'

/** own: a logged-in person changes their password · forced: the login answered passwordChangeRequired (no session) */
export type PasswordMode = 'own' | 'forced'

type PasswordFormProps = {
  mode: PasswordMode
  /** For the "not your e-mail" rule: known when logged in, '' in the forced step (left to the server). */
  email: string
  /** 204: the password is changed (and the API ended the session, own change included). */
  onChanged: () => void
  /** 401 UNAUTHORIZED: the forced step's 5 minutes are over. */
  onStepExpired?: () => void
}

const RULES_ID = 'password-rules'

function schemaFor(mode: PasswordMode, email: string) {
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

/**
 * The password change form of endpoint 10 (MLink-89), for both pages: the own change inside a space and the forced
 * step after a login. Each API answer goes under its field or in the form's alert.
 */
export default function PasswordForm({ mode, email, onChanged, onStepExpired }: PasswordFormProps) {
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
        case 'SESSION_EXPIRED': // staff forced a reset meanwhile: apiFetch already ended the session, the guard
          return // opens the login page with the "expired" notice
        case 'UNAUTHORIZED':
          if (onStepExpired) {
            onStepExpired()
            return
          }
          setFormError(messageFor(error))
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
    onChanged()
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
