type ErrorCapture = (error: unknown) => void

const MAX_PENDING_ERRORS = 20
const pending: unknown[] = []
let capture: ErrorCapture | undefined

function onWindowError(event: ErrorEvent) {
  reportError(event.error ?? event.message)
}

function onUnhandledRejection(event: PromiseRejectionEvent) {
  reportError(event.reason)
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
}

/**
 * Reports an error before or after Sentry is ready. The SDK is a lazy chunk to stay inside the first-visit
 * JavaScript budget; errors from the first render wait in this small queue instead of being lost.
 */
export function reportError(error: unknown): void {
  if (capture) {
    capture(error)
    return
  }
  if (pending.length < MAX_PENDING_ERRORS) pending.push(error)
}

/** Called by the Sentry chunk once `Sentry.init` has run; hands it the errors that arrived while it loaded. */
export function setSentryCapture(next: ErrorCapture): void {
  capture = next
  if (typeof window !== 'undefined') {
    window.removeEventListener('error', onWindowError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
  for (const error of pending.splice(0)) next(error)
}
