import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from './api'
import NotificationBell, { POLL_MS } from './NotificationBell'
import type { Alert } from './types'

// MLink-37 (37.5): the bell of the practitioner's top bar. The API is mocked at the feature's api.ts; the minute
// between two polls is a fake timer.
vi.mock('./api', () => ({ fetchUnreadAlerts: vi.fn(), markAlertRead: vi.fn() }))
const fetchUnreadAlerts = vi.mocked(api.fetchUnreadAlerts)
const markAlertRead = vi.mocked(api.markAlertRead)

function alert(id: string, message: string, createdAt: string): Alert {
  return { id, type: 'APPOINTMENT_CANCELLED', message, appointmentId: `a-${id}`, createdAt }
}
const FIRST = alert('al1', 'Rendez-vous annulé : Ahmed Kacem, jeudi 12 novembre à 09:00, Clinique MedLink Sousse.', '2026-11-11T08:00:00Z')
const SECOND = alert('al2', 'Rendez-vous annulé : Sana Trabelsi, vendredi 13 novembre à 14:00, Clinique MedLink Tunis.', '2026-11-11T09:30:00Z')

function setup() {
  const user = userEvent.setup()
  render(<NotificationBell />)
  return user
}

function bell() {
  return screen.getByRole('button', { name: /^Notifications/ })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  vi.setSystemTime(new Date('2026-11-11T10:00:00Z'))
  fetchUnreadAlerts.mockResolvedValue([FIRST])
})

afterEach(() => {
  vi.useRealTimers()
})

test('the bell shows how many alerts are unread, in its name too', async () => {
  fetchUnreadAlerts.mockResolvedValue([FIRST, SECOND])
  setup()

  expect(await screen.findByRole('button', { name: 'Notifications, 2 non lues' })).toBeInTheDocument()
  expect(within(bell()).getByText('2')).toBeInTheDocument()
})

test('no unread alert: no counter', async () => {
  fetchUnreadAlerts.mockResolvedValue([])
  setup()

  expect(await screen.findByRole('button', { name: 'Notifications, aucune non lue' })).toBeInTheDocument()
  expect(within(bell()).queryByText('0')).toBeNull()
})

test('it asks the API again every minute: a new alert raises the counter', async () => {
  setup()
  expect(await screen.findByRole('button', { name: 'Notifications, 1 non lue' })).toBeInTheDocument()
  expect(fetchUnreadAlerts).toHaveBeenCalledTimes(1)

  fetchUnreadAlerts.mockResolvedValue([SECOND, FIRST])
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_MS)
  })

  expect(fetchUnreadAlerts).toHaveBeenCalledTimes(2)
  expect(await screen.findByRole('button', { name: 'Notifications, 2 non lues' })).toBeInTheDocument()
  expect(POLL_MS).toBe(60_000)
})

test('the list opens under the bell: each alert with its message and when it came, newest first', async () => {
  fetchUnreadAlerts.mockResolvedValue([FIRST, SECOND])
  const user = setup()
  await screen.findByRole('button', { name: 'Notifications, 2 non lues' })

  await user.click(bell())

  expect(bell()).toHaveAttribute('aria-expanded', 'true')
  const panel = screen.getByRole('region', { name: 'Alertes' })
  const items = within(panel).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Sana Trabelsi')
  expect(items[0]).toHaveTextContent('11 novembre à 10:30')
  expect(items[1]).toHaveTextContent('Ahmed Kacem')
})

test('"Marquer comme lue" tells the API, takes the alert off the list and the counter down', async () => {
  fetchUnreadAlerts.mockResolvedValue([FIRST, SECOND])
  markAlertRead.mockResolvedValue(undefined)
  const user = setup()
  await screen.findByRole('button', { name: 'Notifications, 2 non lues' })
  await user.click(bell())

  const panel = screen.getByRole('region', { name: 'Alertes' })
  const first = within(panel).getAllByRole('listitem').find((item) => item.textContent?.includes('Ahmed Kacem'))!
  await user.click(within(first).getByRole('button', { name: 'Marquer comme lue' }))

  expect(markAlertRead).toHaveBeenCalledExactlyOnceWith('al1')
  expect(await screen.findByRole('button', { name: 'Notifications, 1 non lue' })).toBeInTheDocument()
  expect(within(panel).queryByText(/Ahmed Kacem/)).toBeNull()
})

test('a failed "Marquer comme lue" keeps the alert and says so', async () => {
  markAlertRead.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible.'))
  const user = setup()
  await screen.findByRole('button', { name: 'Notifications, 1 non lue' })
  await user.click(bell())

  const panel = screen.getByRole('region', { name: 'Alertes' })
  await user.click(within(panel).getByRole('button', { name: 'Marquer comme lue' }))

  expect(await within(panel).findByRole('alert')).toHaveTextContent('L’alerte n’a pas pu être marquée comme lue.')
  expect(within(panel).getByText(/Ahmed Kacem/)).toBeInTheDocument()
  expect(bell()).toHaveAccessibleName('Notifications, 1 non lue')
})

test('nothing new: the open list says so', async () => {
  fetchUnreadAlerts.mockResolvedValue([])
  const user = setup()
  await screen.findByRole('button', { name: 'Notifications, aucune non lue' })

  await user.click(bell())

  expect(within(screen.getByRole('region', { name: 'Alertes' })).getByText('Aucune nouvelle alerte.')).toBeInTheDocument()
})

test('alerts that cannot be read say so in the list; the next minute tries again', async () => {
  fetchUnreadAlerts.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Connexion impossible.'))
  const user = setup()
  await user.click(await screen.findByRole('button', { name: /^Notifications/ }))

  expect(await within(screen.getByRole('region', { name: 'Alertes' })).findByText('Les alertes n’ont pas pu être chargées.')).toBeInTheDocument()

  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_MS)
  })
  expect(await screen.findByText(/Ahmed Kacem/)).toBeInTheDocument()
})

test('Escape closes the list and gives the focus back to the bell', async () => {
  const user = setup()
  await screen.findByRole('button', { name: 'Notifications, 1 non lue' })
  await user.click(bell())

  await user.keyboard('{Escape}')

  expect(screen.queryByRole('region', { name: 'Alertes' })).toBeNull()
  expect(bell()).toHaveAttribute('aria-expanded', 'false')
  expect(bell()).toHaveFocus()
})

test('it stops asking once the bell is gone (logout, another space)', async () => {
  const { unmount } = render(<NotificationBell />)
  await screen.findByRole('button', { name: 'Notifications, 1 non lue' })

  unmount()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_MS * 3)
  })

  expect(fetchUnreadAlerts).toHaveBeenCalledTimes(1)
})
