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

let unauthorizedHandler: ((error: ApiError) => void) | null = null

// AuthProvider (MLink-56) will register itself here; used by MLink-85.
export function setUnauthorizedHandler(
  handler: ((error: ApiError) => void) | null,
) {
  unauthorizedHandler = handler
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

type RequestOptions = {
  method?: string
  body?: unknown
}

export async function apiFetch<T = void>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (WRITE_METHODS.has(method)) {
    const token = readCookie('XSRF-TOKEN')
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
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
    const error = new ApiError(response.status, code, message, details)
    if (response.status === 401 && SESSION_ENDED_CODES.has(code)) {
      unauthorizedHandler?.(error)
    }
    throw error
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
