import { useEffect, useRef, useState } from 'react'

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'done'; data: T }
  | { status: 'failed'; error: unknown }

/**
 * Calls `call(arg)` once when the page opens (never when `arg` is null) and follows its answer.
 * For calls that must not run twice, like using a single-use mailed token: React's StrictMode runs
 * effects twice in development, so the request is kept in a ref and every run waits for the same one.
 * `call` must be a module-level function (stable), e.g. `useSingleRequest(verifyEmail, token)`.
 */
export function useSingleRequest<A, T>(call: (arg: A) => Promise<T>, arg: A | null): RequestState<T> {
  const request = useRef<Promise<T> | null>(null)
  const [state, setState] = useState<RequestState<T>>(arg === null ? { status: 'idle' } : { status: 'pending' })

  useEffect(() => {
    if (arg === null) return
    let active = true
    request.current ??= call(arg)
    request.current.then(
      (data) => {
        if (active) setState({ status: 'done', data })
      },
      (error: unknown) => {
        if (active) setState({ status: 'failed', error })
      },
    )
    return () => {
      active = false
    }
  }, [call, arg])

  return state
}
