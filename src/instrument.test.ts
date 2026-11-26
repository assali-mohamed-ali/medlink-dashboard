import { afterEach, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ initSentry: vi.fn() }))

vi.mock('./sentry', () => ({ initSentry: mocks.initSentry }))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  mocks.initSentry.mockReset()
})

test('loads the Sentry chunk only when the DSN is configured', async () => {
  vi.resetModules()
  vi.stubEnv('VITE_SENTRY_DSN', 'https://public@o0.ingest.sentry.io/1')

  await import('./instrument')
  await vi.dynamicImportSettled()

  expect(mocks.initSentry).toHaveBeenCalledWith('https://public@o0.ingest.sentry.io/1')
})

test('does nothing without a DSN', async () => {
  vi.resetModules()
  vi.stubEnv('VITE_SENTRY_DSN', '')

  await import('./instrument')
  await vi.dynamicImportSettled()

  expect(mocks.initSentry).not.toHaveBeenCalled()
})
