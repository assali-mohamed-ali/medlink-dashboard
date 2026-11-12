export class ApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Only these 401 codes mean "the session is over". Other 401s are business
// answers (wrong password, wrong MFA code, wrong current password).
const SESSION_ENDED_CODES = new Set(['UNAUTHENTICATED', 'SESSION_EXPIRED'])

// A request the API does not answer within this time fails with TIMEOUT instead of hanging.
const TIMEOUT_MS = 15_000

const CSRF_COOKIE = 'XSRF-TOKEN'

let unauthorizedHandler: ((error: ApiError) => void) | null = null

// AuthProvider registers itself here, so an ended session logs the user out everywhere.
export function setUnauthorizedHandler(
  handler: ((error: ApiError) => void) | null,
) {
  unauthorizedHandler = handler
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
  const value = match ? decodeURIComponent(match.slice(name.length + 1)) : ''
  return value || null
}

// One request for the CSRF cookie, shared by every write that starts while it runs.
let csrfRequest: Promise<void> | null = null

async function csrfToken(): Promise<string | null> {
  if (!readCookie(CSRF_COOKIE)) {
    csrfRequest ??= send('/auth/csrf', { method: 'GET', headers: {} })
      .then(() => undefined)
      .finally(() => {
        csrfRequest = null
      })
    await csrfRequest
  }
  return readCookie(CSRF_COOKIE)
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(0, 'TIMEOUT', 'Le serveur met trop de temps à répondre. Veuillez réessayer.')
    }
    // fetch() only throws when no answer arrived at all (offline, API down, DNS)
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur. Veuillez réessayer.')
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = 'UNKNOWN'
  let message = 'Une erreur est survenue. Veuillez réessayer.'
  let details: unknown
  try {
    const data = await response.json()
    if (typeof data.code === 'string') code = data.code
    if (typeof data.message === 'string') message = data.message
    details = data.details
  } catch {
    // the error body is not JSON: keep the generic message
  }
  return new ApiError(response.status, code, message, details)
}

type RequestOptions = {
  method?: string
  body?: unknown
}

/**
 * The only way the app calls the API (`/api` + path): sends the cookies, the CSRF header on writes
 * (fetching the cookie first when there is none), and turns every failure into an ApiError.
 */
export async function apiFetch<T = void>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (WRITE_METHODS.has(method)) {
    const token = await csrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  const response = await send(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await toApiError(response)
    if (response.status === 401 && SESSION_ENDED_CODES.has(error.code)) {
      unauthorizedHandler?.(error)
    }
    throw error
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
