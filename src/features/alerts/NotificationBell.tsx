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
 * MLink-37 (37.5, 37.6): the practitioner's unread alerts (cancelled appointments). At login, alerts received while
 * away open the list once, said as such. Asks the API when it appears, then every
 * minute while it is on screen; the list opens under the bell, each alert can be marked as read.
 */
export default function NotificationBell() {
  const panelId = useId()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [markFailed, setMarkFailed] = useState(false)
  const [marking, setMarking] = useState<string | null>(null)
  // 37.6: the list opened by itself at login, for the alerts received while away (said once, never again)
  const [away, setAway] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const button = useRef<HTMLButtonElement>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let current = true
    // The bell appears with the space, right after the login (or a reload): its first answer that arrives holds what came while away
    let first = true
    // A missed poll keeps what is shown; the next minute tries again (a 401 is handled by apiFetch)
    const poll = () =>
      fetchUnreadAlerts().then(
        (unread) => {
          if (!current) return
          setAlerts([...unread].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)))
          setLoadFailed(false)
          if (first && unread.length > 0) {
            // 37.6: open the list once, without taking the focus from where the person is
            setOpen(true)
            setAway(true)
            setAnnouncement(
              `${unread.length} alerte${unread.length > 1 ? 's' : ''} reçue${unread.length > 1 ? 's' : ''} pendant votre absence.`,
            )
          }
          first = false
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

  // Close on a click outside the bell and its list, and on Escape wherever the focus is (the list may have opened by
  // itself at login, while the person works elsewhere: then the focus stays where it is)
  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false)
        setAway(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      const inside = root.current?.contains(document.activeElement) ?? false
      setOpen(false)
      setAway(false)
      if (inside) button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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
    <div ref={root} className={styles.root}>
      <button
        ref={button}
        type="button"
        className={styles.bell}
        aria-label={bellName(count)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setMarkFailed(false)
          setAway(false)
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

      {announcement && (
        <p role="status" className="visually-hidden">
          {announcement}
        </p>
      )}

      {open && (
        <section id={panelId} aria-label="Alertes" className={styles.panel}>
          <h2 className={styles.panelTitle}>Alertes</h2>
          {away && <p className={styles.away}>Reçues pendant votre absence</p>}
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
