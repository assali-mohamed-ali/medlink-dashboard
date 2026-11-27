import { useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Card, TextField } from '@/shared/ui'
import { messageFor } from '@/shared/api/errors'
import { confirmEmailChange, requestEmailChange } from '../api'

export default function EmailChange({ onConfirmed }: { onConfirmed: () => Promise<void> }) {
  const [step, setStep] = useState<'request' | 'confirm' | 'accepted'>('request')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || step === 'accepted') return
    const form = event.currentTarget
    const data = new FormData(form)
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (step === 'request') {
        await requestEmailChange(String(data.get('email')).trim(), String(data.get('currentPassword')))
        form.reset()
        setStep('confirm')
      } else {
        await confirmEmailChange(String(data.get('code')).trim())
        form.reset()
        setStep('accepted')
      }
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <Card title="Modifier mon adresse e-mail">
      <p>Reconnectez-vous si votre dernière connexion date de plus de dix minutes. Votre mot de passe et l’accès à la nouvelle boîte sont requis.</p>
      {error && <Alert tone="error">{error}</Alert>}
      {step === 'accepted' ? (
        <>
          <Alert tone="success">Confirmation enregistrée. Le changement peut être en cours ; reconnectez-vous avec la nouvelle adresse une fois appliqué.</Alert>
          <Button onClick={() => void onConfirmed()}>Se reconnecter</Button>
        </>
      ) : (
        <form onSubmit={submit}>
          {step === 'request' ? (
            <>
              <TextField label="Nouvelle adresse e-mail" name="email" type="email" autoComplete="email" required maxLength={254} />
              <TextField label="Mot de passe actuel" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} />
              <Button type="submit" disabled={busy}>Envoyer le code</Button>
            </>
          ) : (
            <>
              <Alert tone="info">Si la demande peut aboutir, un code a été envoyé à la nouvelle adresse. Il est valable 30 minutes.</Alert>
              <TextField label="Code de confirmation" name="code" autoComplete="one-time-code" required minLength={43} maxLength={43} />
              <Button type="submit" disabled={busy}>Confirmer le changement</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => { setError(''); setStep('request') }}>Revenir</Button>
            </>
          )}
        </form>
      )}
    </Card>
  )
}
