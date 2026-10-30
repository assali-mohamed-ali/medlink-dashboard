import { House, Users, type LucideIcon } from 'lucide-react'
import type { Role } from '@/features/auth'
import { paths } from '@/shared/config/paths'

export type MenuEntry = {
  label: string
  to: string
  /** A lucide icon: alone in the icon rail (768–1023 px), above the label in the phone's bottom bar. */
  icon: LucideIcon
}

export type Space = {
  /** The heading of every page of the space. */
  title: string
  /** The person's role in French, shown under their name in the top bar. */
  roleLabel: string
  /**
   * The menu, in order: a sidebar on a computer, a bottom bar on a phone (so at most 5 entries).
   * A new page of a space = one entry here + one route in app/routes.tsx.
   */
  menu: readonly MenuEntry[]
}

/** One space per role: data only, so adding a menu entry or a space never touches the layout's code. */
export const SPACES: Record<Role, Space> = {
  PATIENT: {
    title: 'Espace patient',
    roleLabel: 'Patient',
    menu: [{ label: 'Accueil', to: paths.patient.root, icon: House }],
  },
  PRACTITIONER: {
    title: 'Espace praticien',
    roleLabel: 'Praticien',
    menu: [{ label: 'Accueil', to: paths.practitioner.root, icon: House }],
  },
  ADMINISTRATIVE_STAFF: {
    title: 'Espace administratif',
    roleLabel: 'Personnel administratif',
    menu: [
      { label: 'Accueil', to: paths.staff.root, icon: House },
      { label: 'Gestion des comptes', to: paths.staff.accounts, icon: Users },
    ],
  },
}
