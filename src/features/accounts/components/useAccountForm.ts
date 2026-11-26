import { useRef, useState } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'

/**
 * The sending half of the account forms: one request at a time, the API's 400 messages kept per field (only the
 * fields the form shows), any other error kept for an Alert. `send` resolves to true when the request succeeded.
 */
export function useAccountForm<F extends string>(fields: readonly F[]) {
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)

  async function send(request: () => Promise<unknown>, onConflict?: (error: ApiError) => Partial<Record<F, string>> | null) {
    if (sendingRef.current) return false
    sendingRef.current = true
    setSending(true)
    setErrors({})
    setFailure(null)
    try {
      await request()
      return true
    } catch (error) {
      const perField =
        error instanceof ApiError && error.code === 'VALIDATION_FAILED' ? fieldErrors(error.details, fields) : {}
      const conflict = error instanceof ApiError && onConflict ? onConflict(error) : null
      if (conflict) setErrors(conflict)
      else if (Object.keys(perField).length > 0) setErrors(perField)
      else setFailure(messageFor(error))
      return false
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return { errors, failure, sending, send }
}
