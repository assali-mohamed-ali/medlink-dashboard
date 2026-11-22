import { lazy } from 'react'

// The spaces are lazy chunks: only a logged-in person downloads them, so a first visit stays within the entry budget
// (scripts/budget.mjs). routes.tsx renders them under the role's guard, which stays in the entry chunk.
export const SpaceLayout = lazy(() => import('@/spaces/SpaceLayout'))
export const SpaceHome = lazy(() => import('@/spaces/SpaceHome'))
export const SpaceComingSoon = lazy(() => import('@/spaces/SpaceComingSoon'))
