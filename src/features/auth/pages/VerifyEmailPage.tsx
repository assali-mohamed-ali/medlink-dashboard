import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { messageFor } from '@/shared/api/errors'
import { paths } from '@/shared/config/paths'
import PublicHeader from '@/shared/layout/PublicHeader'
import { useSingleRequest } from '@/shared/lib/useSingleRequest'
import { useTokenFromUrl } from '@/shared/lib/useTokenFromUrl'
import { Alert, Button, PageLoader, TextField } from '@/shared/ui'
import { resendVerification, verifyEmail } from '../api'
import styles from './VerifyEmailPage.module.css'

const resendSchema = z.object({
  email: z.string().trim().email('Saisissez une adresse e-mail valide.'),
})

type ResendValues = z.infer<typeof resendSchema>

/** "Recevoir un nouveau lien": the API answers the same whether or not the address has an account. */
function ResendForm() {
  const [answer, setAnswer] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendValues>({ resolver: zodResolver(resendSchema), defaultValues: { email: '' } })

  async function onSubmit({ email }: ResendValues) {
    setAnswer(null)
    try {
      const response = await resendVerification(email)
      setAnswer({
        tone: 'info',
        text: response?.message ?? 'Si un compte non vérifié existe pour cet e-mail, un nouveau lien a été envoyé.',
      })
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

/**
 * /verifier-email?token=…: the link the API mails after signup (MLink-80, endpoint 3). Confirms the address
 * once; on a bad or old link, offers a new one (endpoint 4).
 */
export default function VerifyEmailPage() {
  const token = useTokenFromUrl()
  const verification = useSingleRequest(verifyEmail, token)

  let content
  if (verification.status === 'pending') {
    content = <PageLoader label="Vérification de votre adresse…" />
  } else if (verification.status === 'done') {
    content = (
      <>
        <Alert tone="success">Votre adresse e-mail est confirmée.</Alert>
        <Link className={styles.link} to={paths.login}>
          Se connecter
        </Link>
      </>
    )
  } else {
    content = (
      <>
        <Alert tone="error">
          {verification.status === 'failed'
            ? messageFor(verification.error)
            : 'Ouvrez le lien reçu par e-mail pour confirmer votre adresse.'}
        </Alert>
        <p className={styles.lead}>Recevez un nouveau lien (valable 24 heures) :</p>
        <ResendForm />
        <Link className={styles.link} to={paths.login}>
          Se connecter
        </Link>
      </>
    )
  }

  return (
    <>
      <PublicHeader variant="login" />
      <main className={`${styles.page} public-header-offset`}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <MailCheck size={28} />
          </span>
          <h1 className={styles.title}>Confirmation de votre adresse e-mail</h1>
          <div className={styles.stack}>{content}</div>
        </div>
      </main>
    </>
  )
}
