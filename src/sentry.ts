import { browserTracingIntegration, captureException, init } from '@sentry/react'
import { setSentryCapture } from '@/shared/lib/errorReporting'
import { scrubSentryEvent } from '@/shared/lib/sentryScrub'

/** The Sentry SDK is a lazy chunk: see `instrument.ts` and `errorReporting.ts`. */
export function initSentry(dsn: string): void {
  init({
    dsn,
    environment: import.meta.env.MODE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
    },
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    tracePropagationTargets: [/^\//],
    integrations: [browserTracingIntegration()],
    beforeSend: (event) => scrubSentryEvent(event),
    beforeSendTransaction: (event) => scrubSentryEvent(event),
  })

  setSentryCapture((error) => captureException(error))
}
