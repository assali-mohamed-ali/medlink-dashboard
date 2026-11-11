import { useEffect, useId, useRef, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { fetchUnreadAlerts, markAlertRead } from './api'
import type { Alert } from './types'
import styles from './alerts.module.css'

/** How often the bell asks the API (MLink-37: polling, no websocket). */
export const POLL_MS = 60_000

/** "11 novembre à 10:30", Tunis time. */
function when(createdAt: string) {
  const date = new Date(createdAt)
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Tunis' })
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })
  return `${day} à ${time}`
}

function bellName(count: number) {
  if (count === 0) return 'Notifications, aucune non lue'
  return `Notifications, ${count} non lue${count > 1 ? 's' : ''}`
}

/**
 * MLink-37 (37.5): the practitioner's unread alerts (cancelled appointments). Asks the API when it appears, then every
 * minute while it is on screen; the list opens under the bell, each alert can be marked as read.
 */
export default function NotificationBell() {
  const panelId = useId()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [markFailed, setMarkFailed] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let current = true
    // A missed poll keeps what is shown; the next minute tries again (a 401 is handled by apiFetch)
    const poll = () =>
      fetchUnreadAlerts().then(
        (unread) => {
          if (!current) return
          setAlerts([...unread].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
          setLoadFailed(false)
        },
        () => current && setLoadFailed(true),
      )
    void poll()
    const timer = setInterval(() => void poll(), POLL_MS)
    return () => {
      current = false
      clearInterval(timer)
    }
  }, [])

  // Close on a click outside the bell and its list
  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  function close() {
    setOpen(false)
    button.current?.focus()
  }

  async function markRead(alert: Alert) {
    if (marking) return
    setMarking(alert.id)
    setMarkFailed(false)
    try {
      await markAlertRead(alert.id)
      setAlerts((before) => before.filter((other) => other.id !== alert.id))
    } catch {
      setMarkFailed(true)
    } finally {
      setMarking(null)
    }
  }

  const count = alerts.length

  return (
    <div
      ref={root}
      className={styles.root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation()
          close()
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className={styles.bell}
        aria-label={bellName(count)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setMarkFailed(false)
          setOpen((was) => !was)
        }}
      >
        <Bell size={20} aria-hidden="true" />
        {count > 0 && (
          <span className={styles.count} aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <section id={panelId} aria-label="Alertes" className={styles.panel}>
          <h2 className={styles.panelTitle}>Alertes</h2>
          {markFailed && (
            <p role="alert" className={styles.failure}>
              L’alerte n’a pas pu être marquée comme lue. Réessayez.
            </p>
          )}
          {loadFailed && count === 0 ? (
            <p className={styles.empty}>Les alertes n’ont pas pu être chargées.</p>
          ) : count === 0 ? (
            <p className={styles.empty}>Aucune nouvelle alerte.</p>
          ) : (
            <ul className={styles.list}>
              {alerts.map((alert) => (
                <li key={alert.id} className={styles.item}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.body}>
                    <span className={styles.message}>{alert.message}</span>
                    <span className={styles.when}>{when(alert.createdAt)}</span>
                  </span>
                  <button
                    type="button"
                    className={styles.read}
                    disabled={marking === alert.id}
                    onClick={() => void markRead(alert)}
                  >
                    <Check size={14} aria-hidden="true" />
                    Marquer comme lue
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
