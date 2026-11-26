import type { ErrorEvent } from '@sentry/react'
import { expect, test } from 'vitest'
import { scrubSentryEvent, scrubSentryUrl } from './sentryScrub'

test('scrubs mailed tokens from absolute and relative URLs, keeping other parameters', () => {
  expect(scrubSentryUrl('https://medlink.example.com/verifier-email?token=secret&lang=fr')).toBe(
    'https://medlink.example.com/verifier-email?token=%5BFiltered%5D&lang=fr',
  )
  expect(scrubSentryUrl('/configurer-code?token=secret&lang=fr')).toBe(
    '/configurer-code?token=%5BFiltered%5D&lang=fr',
  )
  expect(scrubSentryUrl('/patient/creneaux?from=2026-01-01&to=2026-01-02')).toBe(
    '/patient/creneaux?from=2026-01-01&to=2026-01-02',
  )
})

test('scrubs tokens from event requests, headers, breadcrumbs, spans and user context', () => {
  const event = {
    request: {
      url: 'https://medlink.example.com/activer-compte?token=secret&lang=fr',
      query_string: 'token=secret',
      headers: {
        Accept: 'application/json',
        Cookie: 'SESSION=secret',
        'X-XSRF-TOKEN': 'secret',
      },
      data: { password: 'secret' },
    },
    breadcrumbs: [{ data: { url: 'https://medlink.example.com/verifier-email?token=secret' } }],
    spans: [{ data: { 'url.query': 'token=secret&from=2026-01-01' } }],
    user: { id: 'patient-1' },
  } as unknown as ErrorEvent

  const scrubbed = scrubSentryEvent(event)

  expect(scrubbed.request?.url).toBe('https://medlink.example.com/activer-compte?token=%5BFiltered%5D&lang=fr')
  expect(scrubbed.request?.query_string).toBe('[Filtered]')
  expect(scrubbed.request?.headers?.Cookie).toBe('[Filtered]')
  expect(scrubbed.request?.headers?.['X-XSRF-TOKEN']).toBe('[Filtered]')
  expect(scrubbed.request?.headers?.Accept).toBe('application/json')
  expect(scrubbed.request?.data).toBe('[Filtered]')
  expect(scrubbed.breadcrumbs?.[0]?.data?.url).toBe(
    'https://medlink.example.com/verifier-email?token=%5BFiltered%5D',
  )
  expect(scrubbed.spans?.[0]?.data?.['url.query']).toBe('token=%5BFiltered%5D&from=2026-01-01')
  expect(scrubbed.user).toBeUndefined()
})
