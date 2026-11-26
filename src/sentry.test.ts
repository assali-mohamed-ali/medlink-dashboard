import { beforeEach, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setSentryCapture: vi.fn(),
}))

vi.mock('@sentry/react', () => ({
  init: mocks.init,
  captureException: mocks.captureException,
  browserTracingIntegration: () => ({ name: 'BrowserTracing' }),
}))

vi.mock('@/shared/lib/errorReporting', () => ({
  setSentryCapture: mocks.setSentryCapture,
}))

import { initSentry } from './sentry'

beforeEach(() => {
  vi.clearAllMocks()
})

test('initializes Sentry with privacy settings, scrubbing and the error queue', () => {
  initSentry('https://public@o0.ingest.sentry.io/1')

  expect(mocks.init).toHaveBeenCalledOnce()
  const options = mocks.init.mock.calls[0]?.[0] as {
    dsn: string
    dataCollection: Record<string, unknown>
    beforeSend: (event: Record<string, unknown>) => Record<string, unknown>
  }

  expect(options.dsn).toBe('https://public@o0.ingest.sentry.io/1')
  expect(options.dataCollection).toMatchObject({
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  })

  const event = {
    request: {
      url: 'https://medlink.example.com/verifier-email?token=secret&lang=fr',
      query_string: 'token=secret',
      headers: { Cookie: 'SESSION=secret', Accept: 'application/json' },
      data: { password: 'secret' },
    },
    user: { id: 'patient-1' },
  }
  const scrubbed = options.beforeSend(event) as {
    request: { url: string; query_string: string; headers: Record<string, string>; data: unknown }
    user?: unknown
  }

  expect(scrubbed.request.url).toBe(
    'https://medlink.example.com/verifier-email?token=%5BFiltered%5D&lang=fr',
  )
  expect(scrubbed.request.query_string).toBe('[Filtered]')
  expect(scrubbed.request.headers.Cookie).toBe('[Filtered]')
  expect(scrubbed.request.headers.Accept).toBe('application/json')
  expect(scrubbed.request.data).toBe('[Filtered]')
  expect(scrubbed.user).toBeUndefined()

  expect(mocks.setSentryCapture).toHaveBeenCalledOnce()
  const capture = mocks.setSentryCapture.mock.calls[0]?.[0] as (error: unknown) => void
  const error = new Error('boom')
  capture(error)
  expect(mocks.captureException).toHaveBeenCalledWith(error)
})
