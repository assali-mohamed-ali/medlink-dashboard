import { useEffect, useState } from 'react'
import { messageFor } from '@/shared/api/errors'
import { fetchReports } from '../api'
import type { Report } from '../types'

export type ReportsLoad =
  | { status: 'loading' }
  | { status: 'ready'; reports: Report[] }
  | { status: 'error'; message: string }

type Answer = { key: number; load: ReportsLoad }

/**
 * MLink-32: the patient's reports, newest first, read by the page so its header and the reports card share one answer.
 * After a save the list already shown stays while it is read again (no flash).
 */
export function useReports(patientId: string) {
  const [attempt, setAttempt] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)

  useEffect(() => {
    let current = true
    fetchReports(patientId).then(
      (reports) => {
        if (!current) return
        const sorted = [...reports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        setAnswer({ key: attempt, load: { status: 'ready', reports: sorted } })
      },
      (error) => current && setAnswer({ key: attempt, load: { status: 'error', message: messageFor(error) } }),
    )
    return () => {
      current = false
    }
  }, [patientId, attempt])

  const load: ReportsLoad =
    answer?.key === attempt || answer?.load.status === 'ready' ? answer.load : { status: 'loading' }

  return { load, reload: () => setAttempt((n) => n + 1) }
}

/** "5 novembre 2026 à 16:00", Tunis time. */
export function when(createdAt: string) {
  const date = new Date(createdAt)
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Tunis' })
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })
  return `${day} à ${time}`
}
