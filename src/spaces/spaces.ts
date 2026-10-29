import type { Role } from '@/features/auth'
import { paths } from '@/shared/config/paths'

export type MenuEntry = {
  label: string
  to: string
}

export type Space = {
  /** The heading of every page of the space. */
  title: string
  /** The side menu, in order. A new page of a space = one entry here + one route in app/routes.tsx. */
  menu: readonly MenuEntry[]
}

/** One space per role: data only, so adding a menu entry or a space never touches the layout's code. */
export const SPACES: Record<Role, Space> = {
  PATIENT: {
    title: 'Espace patient',
    menu: [{ label: 'Accueil', to: paths.patient.root }],
  },
  PRACTITIONER: {
    title: 'Espace praticien',
    menu: [{ label: 'Accueil', to: paths.practitioner.root }],
  },
  ADMINISTRATIVE_STAFF: {
    title: 'Espace administratif',
    menu: [
      { label: 'Accueil', to: paths.staff.root },
      { label: 'Gestion des comptes', to: paths.staff.accounts },
    ],
  },
}
