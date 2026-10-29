import type { ComponentType } from 'react'

/**
 * A route's `lazy` loader for a page module with a default export:
 * `{ path: paths.login, lazy: lazyPage(() => import('./pages/LoginPage')) }`.
 * Each page becomes its own chunk, downloaded the first time its route is opened (faster first load).
 */
export function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default })
}
