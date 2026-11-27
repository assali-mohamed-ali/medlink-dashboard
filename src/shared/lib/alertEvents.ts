/**
 * MLink-37 (37.7): the bell saw an alert it had not seen yet. Pages that show the same facts (the agenda) read them
 * again, so they match the database. A browser event: the bell and the pages stay separate features.
 */
const NEW_ALERTS = 'medlink:new-alerts'

export function announceNewAlerts() {
  window.dispatchEvent(new Event(NEW_ALERTS))
}

/** Calls `listener` each time new alerts arrive; returns what stops it (for a useEffect cleanup). */
export function onNewAlerts(listener: () => void) {
  window.addEventListener(NEW_ALERTS, listener)
  return () => window.removeEventListener(NEW_ALERTS, listener)
}
