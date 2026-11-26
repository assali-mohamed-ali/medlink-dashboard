import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  FileText,
  House,
  KeyRound,
  MessageSquare,
  ScrollText,
  Stethoscope,
  UserRound,
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
  /** Pages reached from this entry's page, with no entry of their own: on them, this entry stays marked current. */
  also?: readonly string[]
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
    menu: [
      { label: 'Accueil', to: paths.patient.root, icon: House },
      { label: 'Prendre rendez-vous', to: paths.patient.slots, icon: CalendarPlus },
      { label: 'Mes rendez-vous', to: paths.patient.appointments, icon: CalendarCheck },
      // The password page opens from the profile ("Modifier le mot de passe"), as for the practitioner
      { label: 'Profil', to: paths.patient.profile, icon: UserRound, also: [paths.patient.password] },
    ],
    home: {
      intro: 'Vos rendez-vous, vos documents et vos échanges avec vos soignants, au même endroit.',
      parts: [
        {
          title: 'Rendez-vous',
          text: 'Vos prochains rendez-vous et la prise de rendez-vous en ligne.',
          icon: CalendarDays,
          link: { to: paths.patient.appointments, label: 'Voir mes rendez-vous' },
        },
        { title: 'Documents', text: 'Vos comptes rendus, ordonnances et résultats.', icon: FileText },
        { title: 'Messages', text: 'Vos échanges avec vos soignants.', icon: MessageSquare },
      ],
    },
  },
  PRACTITIONER: {
    title: 'Espace praticien',
    roleLabel: 'Praticien',
    menu: [
      { label: 'Accueil', to: paths.practitioner.root, icon: House },
      { label: 'Agenda', to: paths.practitioner.agenda, icon: CalendarDays },
      // The password page opens from the profile ("Modifier le mot de passe"), not from the menu
      { label: 'Profil', to: paths.practitioner.profile, icon: UserRound, also: [paths.practitioner.password] },
    ],
    home: {
      intro: 'Votre journée en un coup d’œil.',
      parts: [
        {
          title: 'Agenda',
          text: 'Vos consultations du jour et à venir.',
          icon: CalendarDays,
          link: { to: paths.practitioner.agenda, label: 'Ouvrir l’agenda' },
        },
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
      { label: 'Journal d’audit', to: paths.staff.audit, icon: ScrollText },
      { label: 'Statistiques', to: paths.staff.stats, icon: ChartColumn },
      { label: 'Rendez-vous des cliniques', to: paths.staff.activity, icon: CalendarDays },
      { label: 'Mot de passe', to: paths.staff.password, icon: KeyRound },
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
        {
          title: 'Statistiques',
          text: 'Des chiffres anonymisés sur les rendez-vous, à lire ou à télécharger.',
          icon: ChartColumn,
          link: { to: paths.staff.stats, label: 'Ouvrir les statistiques' },
        },
        {
          title: 'Rendez-vous des cliniques',
          text: 'Le planning de chaque praticien dans les trois cliniques, en lecture seule.',
          icon: CalendarDays,
          link: { to: paths.staff.activity, label: 'Ouvrir les rendez-vous des cliniques' },
        },
      ],
    },
  },
}
