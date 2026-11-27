import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { reportError } from '@/shared/lib/errorReporting'
import RouteErrorPage from './RouteErrorPage'

vi.mock('@/shared/lib/errorReporting', () => ({ reportError: vi.fn() }))

function Broken(): never {
  throw new Error('secret internal detail')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test('a page that crashes is reported and shows a friendly page, never the error itself', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the caught error in dev
  const router = createMemoryRouter([{ path: '/', element: <Broken />, errorElement: <RouteErrorPage /> }])
  render(<RouterProvider router={router} />)
  expect(await screen.findByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument()
  expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'secret internal detail' }))
  expect(screen.queryByText(/secret internal detail/)).toBeNull()
  expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/')
})
