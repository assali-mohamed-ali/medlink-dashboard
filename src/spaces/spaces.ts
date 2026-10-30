import {
  CalendarDays,
  FileText,
  House,
  MessageSquare,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/features/auth'
import { paths } from '@/shared/config/paths'

export type MenuEntry = {
  label: string
  to: string
  /** A lucide icon: alone in the icon rail (768–1023 px), above the label in the phone's bottom bar. */
  icon: LucideIcon
}

/** A part of the space shown on its home: a link when its page exists, "Bientôt disponible" until then. */
export type HomePart = {
  title: string
  /** One sentence: what the person will find there. */
  text: string
  icon: LucideIcon
  link?: { to: string; label: string }
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
  /** The home: one sentence under the greeting, then the 1–3 parts that matter for the role. */
  home: { intro: string; parts: readonly HomePart[] }
}

/** One space per role: data only, so adding a menu entry or a space never touches the layout's code. */
export const SPACES: Record<Role, Space> = {
  PATIENT: {
    title: 'Espace patient',
    roleLabel: 'Patient',
    menu: [{ label: 'Accueil', to: paths.patient.root, icon: House }],
    home: {
      intro: 'Vos rendez-vous, vos documents et vos échanges avec vos soignants, au même endroit.',
      parts: [
        { title: 'Rendez-vous', text: 'Vos prochains rendez-vous et la prise de rendez-vous en ligne.', icon: CalendarDays },
        { title: 'Documents', text: 'Vos comptes rendus, ordonnances et résultats.', icon: FileText },
        { title: 'Messages', text: 'Vos échanges avec vos soignants.', icon: MessageSquare },
      ],
    },
  },
  PRACTITIONER: {
    title: 'Espace praticien',
    roleLabel: 'Praticien',
    menu: [{ label: 'Accueil', to: paths.practitioner.root, icon: House }],
    home: {
      intro: 'Votre journée en un coup d’œil.',
      parts: [
        { title: 'Agenda', text: 'Vos consultations du jour et à venir.', icon: CalendarDays },
        { title: 'Patients', text: 'Les dossiers des patients que vous suivez.', icon: Stethoscope },
        { title: 'Messages', text: 'Vos échanges avec vos patients et l’équipe.', icon: MessageSquare },
      ],
    },
  },
  ADMINISTRATIVE_STAFF: {
    title: 'Espace administratif',
    roleLabel: 'Personnel administratif',
    menu: [
      { label: 'Accueil', to: paths.staff.root, icon: House },
      { label: 'Gestion des comptes', to: paths.staff.accounts, icon: Users },
    ],
    home: {
      intro: 'Les comptes et l’organisation des trois cliniques.',
      parts: [
        {
          title: 'Gestion des comptes',
          text: 'Créer, activer et désactiver les comptes du personnel.',
          icon: Users,
          link: { to: paths.staff.accounts, label: 'Ouvrir la gestion des comptes' },
        },
        { title: 'Rendez-vous des cliniques', text: 'Les plannings des trois cliniques.', icon: CalendarDays },
      ],
    },
  },
}
