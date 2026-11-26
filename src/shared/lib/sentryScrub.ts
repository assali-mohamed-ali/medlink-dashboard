import type { Event } from '@sentry/react'

const FILTERED = '[Filtered]'

const SENSITIVE_PARAMETERS = new Set([
  'accesstoken',
  'apikey',
  'auth',
  'authorization',
  'code',
  'confirm',
  'csrf',
  'email',
  'idtoken',
  'invitation',
  'invite',
  'jwt',
  'key',
  'password',
  'refreshtoken',
  'reset',
  'secret',
  'session',
  'sessionstate',
  'sig',
  'signature',
  'state',
  'ticket',
  'token',
  'verification',
  'xsrf',
])

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxyauthorization',
  'referer',
  'setcookie',
  'xapikey',
  'xcsrftoken',
  'xxsrftoken',
])

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PARAMETERS.has(normalizeKey(key))
}

function isSensitiveHeader(key: string): boolean {
  return SENSITIVE_HEADERS.has(normalizeKey(key))
}

function scrubSearchParams(params: URLSearchParams): boolean {
  let changed = false
  for (const key of [...params.keys()]) {
    if (isSensitiveKey(key)) {
      params.set(key, FILTERED)
      changed = true
    }
  }
  return changed
}

/**
 * Removes mailed tokens and other secrets from a URL before it leaves the browser.
 * Query parameters keep their names, so a stack trace still says what the page was doing.
 */
export function scrubSentryUrl(rawUrl: string): string {
  try {
    const relative = rawUrl.startsWith('/')
    const url = new URL(rawUrl, 'http://localhost')
    let changed = scrubSearchParams(url.searchParams)

    if (url.username) {
      url.username = FILTERED
      changed = true
    }
    if (url.password) {
      url.password = FILTERED
      changed = true
    }

    const hashQuery = url.hash.indexOf('?')
    if (hashQuery !== -1) {
      const params = new URLSearchParams(url.hash.slice(hashQuery + 1))
      if (scrubSearchParams(params)) {
        url.hash = `${url.hash.slice(0, hashQuery)}?${params.toString()}`
        changed = true
      }
    }

    if (!changed) return rawUrl
    return relative ? `${url.pathname}${url.search}${url.hash}` : url.toString()
  } catch {
    return FILTERED
  }
}

function scrubQueryString(query: string): string {
  const params = new URLSearchParams(query)
  return scrubSearchParams(params) ? params.toString() : query
}

function scrubData(data: Record<string, unknown> | undefined): void {
  if (!data) return
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') continue

    const normalizedKey = normalizeKey(key)
    if (normalizedKey === 'urlquery') {
      data[key] = scrubQueryString(value)
    } else if (normalizedKey === 'urlfragment') {
      data[key] = scrubSentryUrl(`#${value}`)
    } else if (normalizedKey === 'url' || normalizedKey === 'urlfull' || normalizedKey === 'httpurl') {
      data[key] = scrubSentryUrl(value)
    } else if (isSensitiveKey(key)) {
      data[key] = FILTERED
    }
  }
}

function scrubRequest(request: Event['request']): void {
  if (!request) return

  if (request.url) request.url = scrubSentryUrl(request.url)
  if (request.query_string) request.query_string = FILTERED
  if (request.cookies) request.cookies = {}
  if (request.data !== undefined) request.data = FILTERED

  if (request.headers) {
    for (const key of Object.keys(request.headers)) {
      if (isSensitiveHeader(key)) request.headers[key] = FILTERED
    }
  }
}

/** Defense in depth: the SDK-side scrubbing hook, run on every error and transaction event. */
export function scrubSentryEvent<T extends Event>(event: T): T {
  scrubRequest(event.request)

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.data) scrubData(breadcrumb.data)
  }
  for (const span of event.spans ?? []) {
    if (span.data) scrubData(span.data)
  }

  delete event.user
  return event
}
