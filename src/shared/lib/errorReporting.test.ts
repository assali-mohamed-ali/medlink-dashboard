import { expect, test, vi } from 'vitest'
import { reportError, setSentryCapture } from './errorReporting'

test('queues errors until Sentry is ready, then flushes them and reports directly', () => {
  const capture = vi.fn()

  reportError(new Error('before Sentry'))
  setSentryCapture(capture)

  expect(capture).toHaveBeenCalledWith(expect.objectContaining({ message: 'before Sentry' }))

  reportError(new Error('after Sentry'))
  expect(capture).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'after Sentry' }))
  expect(capture).toHaveBeenCalledTimes(2)
})
