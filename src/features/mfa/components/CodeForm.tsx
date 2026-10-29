import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { roleHome, useAuth } from '@/features/auth'
import { ApiError } from '@/shared/api/apiClient'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import { Alert, Button, TextField } from '@/shared/ui'
import { verifyMfa } from '../api'
import styles from '../mfa.module.css'

const codeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Saisissez les 6 chiffres du code.'),
})

type CodeValues = z.infer<typeof codeSchema>

/**
 * The 6-digit code step, shared by both MFA pages: POST /api/auth/mfa/verify, then the role's space.
 * The code is never kept: the field is cleared after every refused try.
 */
export default function CodeForm() {
  const navigate = useNavigate()
  const { completeLogin } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })

  async function onSubmit({ code }: CodeValues) {
    setFormError(null)
    try {
      const { user } = await verifyMfa(code)
      completeLogin(user)
      navigate(roleHome(user.roles), { replace: true })
    } catch (error) {
      reset({ code: '' })
      if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
        // The 5-minute step after the password is over: log in again
        navigate(paths.login, { replace: true, state: { stepExpired: true } })
        return
      }
      if (error instanceof ApiError && error.code === 'MFA_LOCKED') setLocked(true)
      setFormError(messageFor(error))
    }
  }

  if (locked) {
    return (
      <div className={styles.stack}>
        <Alert tone="error">{formError}</Alert>
        <Link className={styles.link} to={paths.login}>
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form className={styles.stack} onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label={
          <>
            <KeyRound size={18} aria-hidden="true" />
            Code à 6 chiffres
          </>
        }
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        error={errors.code?.message}
        {...register('code')}
      />
      <Button type="submit" fullWidth loading={isSubmitting}>
        Valider
      </Button>
    </form>
  )
}
