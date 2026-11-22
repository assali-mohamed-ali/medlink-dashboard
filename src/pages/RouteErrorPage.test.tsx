import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import RouteErrorPage from './RouteErrorPage'

function Broken(): never {
  throw new Error('secret internal detail')
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('a page that crashes shows a friendly page, never the error itself', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the caught error in dev
  const router = createMemoryRouter([{ path: '/', element: <Broken />, errorElement: <RouteErrorPage /> }])
  render(<RouterProvider router={router} />)
  expect(await screen.findByRole('heading', { name: 'Une erreur est survenue' })).toBeInTheDocument()
  expect(screen.queryByText(/secret internal detail/)).toBeNull()
  expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/')
})
