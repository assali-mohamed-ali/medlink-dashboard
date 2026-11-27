import type { RouteObject } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import { lazyPage } from '@/shared/lib/lazyPage'
import { AgendaPage } from './pageChunks'

/** Pages of the practitioner's space (MLink-26): app/routes.tsx puts them under the PRACTITIONER guard and layout. */
export const practitionerAgendaPages: RouteObject[] = [
  { path: paths.practitioner.agenda, element: <AgendaPage /> },
  { path: paths.practitioner.absences, lazy: lazyPage(() => import("./pages/AbsencesPage")) },
]
