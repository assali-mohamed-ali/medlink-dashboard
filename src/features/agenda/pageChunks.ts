import { lazy } from 'react'

// The feature's pages as lazy components, like the space's own (app/spaceChunks.ts): a page's chunk downloads the
// first time it opens, under the space layout's Suspense. A route `lazy` loader instead changes how the bundler splits
// the shared code and pushes the router into the entry chunk, over the first-visit budget (npm run check:budget).
export const AgendaPage = lazy(() => import('./pages/AgendaPage'))
