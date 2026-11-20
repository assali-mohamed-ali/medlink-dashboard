import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { messageFor } from '@/shared/api/errors'
import { Alert, Button, TextField } from '@/shared/ui'
import styles from '../pages/VerifyEmailPage.module.css'

const resendSchema = z.object({
  email: z.string().trim().email('Saisissez une adresse e-mail valide.'),
})

type ResendValues = z.infer<typeof resendSchema>

type Props = {
  /** The API call that mails a new link (verify e-mail or account activation). */
  send: (email: string) => Promise<{ message?: string } | undefined>
  /** Shown when the API answers without a message. */
  fallback: string
}

/**
 * "Recevoir un nouveau lien", for the pages a mailed link opens: the API answers the same whether or not the address
 * has an account, so the page never tells either.
 */
export default function ResendLinkForm({ send, fallback }: Props) {
  const [answer, setAnswer] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendValues>({ resolver: zodResolver(resendSchema), defaultValues: { email: '' } })

  async function onSubmit({ email }: ResendValues) {
    setAnswer(null)
    try {
      const response = await send(email)
      setAnswer({ tone: 'info', text: response?.message ?? fallback })
    } catch (error) {
      setAnswer({ tone: 'error', text: messageFor(error) })
    }
  }

  return (
    <form className={styles.stack} onSubmit={handleSubmit(onSubmit)} noValidate>
      <TextField
        label={
          <>
            <Mail size={18} aria-hidden="true" />
            Adresse e-mail
          </>
        }
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" variant="secondary" loading={isSubmitting}>
        Recevoir un nouveau lien
      </Button>
      {answer && <Alert tone={answer.tone}>{answer.text}</Alert>}
    </form>
  )
}
