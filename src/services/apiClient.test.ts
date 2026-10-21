import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError, apiFetch, setUnauthorizedHandler } from './apiClient'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  document.cookie = 'XSRF-TOKEN=abc123'
})

afterEach(() => {
  fetchMock.mockReset()
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
})

test('sends cookies and no CSRF header on a GET', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  await apiFetch('/auth/csrf')
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/auth/csrf')
  expect(init.credentials).toBe('same-origin')
  expect(init.headers['X-XSRF-TOKEN']).toBeUndefined()
})

test('copies the XSRF cookie into the header on a POST', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  await apiFetch('/auth/logout', { method: 'POST' })
  expect(fetchMock.mock.calls[0][1].headers['X-XSRF-TOKEN']).toBe('abc123')
})

test('sends a JSON body with the right content type', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  await apiFetch('/auth/verify-email', {
    method: 'POST',
    body: { token: 'x' },
  })
  const init = fetchMock.mock.calls[0][1]
  expect(init.headers['Content-Type']).toBe('application/json')
  expect(init.body).toBe(JSON.stringify({ token: 'x' }))
})

test('returns undefined on a 204', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  await expect(apiFetch('/auth/csrf')).resolves.toBeUndefined()
})

test('returns the parsed JSON on a 200', async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ user: { id: 1 } }), { status: 200 }),
  )
  await expect(apiFetch('/auth/me')).resolves.toEqual({ user: { id: 1 } })
})

test('turns the error body into an ApiError', async () => {
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({ code: 'FORBIDDEN', message: 'Accès refusé.' }),
      { status: 403 },
    ),
  )
  await expect(apiFetch('/admin/users')).rejects.toMatchObject({
    status: 403,
    code: 'FORBIDDEN',
    message: 'Accès refusé.',
  })
})

test('handles a non-JSON error body', async () => {
  fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))
  await expect(apiFetch('/x')).rejects.toBeInstanceOf(ApiError)
})

test('calls the unauthorized handler on a 401', async () => {
  const handler = vi.fn()
  setUnauthorizedHandler(handler)
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 }),
  )
  await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError)
  expect(handler).toHaveBeenCalledTimes(1)
})

test('does not call the unauthorized handler on a 403', async () => {
  const handler = vi.fn()
  setUnauthorizedHandler(handler)
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ code: 'FORBIDDEN' }), { status: 403 }),
  )
  await expect(apiFetch('/admin/users')).rejects.toBeInstanceOf(ApiError)
  expect(handler).not.toHaveBeenCalled()
})
