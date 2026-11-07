import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Reads `?token=` from a mailed link once, then removes it from the address bar (browser history,
 * screenshots, a shared screen, the Referer of a later request). The token lives in memory only.
 * `fallback`: a token the app passed in router state instead (e.g. after logging in again).
 */
export function useTokenFromUrl(fallback?: string | null): string | null {
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token') ?? fallback ?? null)

  useEffect(() => {
    if (!searchParams.has('token')) return
    const rest = new URLSearchParams(searchParams)
    rest.delete('token')
    setSearchParams(rest, { replace: true })
  }, [searchParams, setSearchParams])

  return token
}
