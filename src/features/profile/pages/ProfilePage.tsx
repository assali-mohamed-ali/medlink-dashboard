import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarClock,
  Clock,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import UserAvatar from '@/shared/components/UserAvatar'
import { paths } from '@/shared/config/paths'
import { type Week as WeekData, fetchWeek, thisWeek } from '../api'
import styles from '../profile.module.css'

type Week = { status: 'loading' } | { status: 'ready'; agenda: WeekData } | { status: 'error' }

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`
}

/** A labelled read-only field with an icon (no route edits a profile yet). */
function ReadOnlyField({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <div className={styles.fieldBox}>
        <span className={styles.fieldIcon} aria-hidden="true">
          {icon}
        </span>
        <input id={id} className={styles.fieldInput} value={value} readOnly />
      </div>
    </div>
  )
}

/**
 * The practitioner's profile and security, after the Stitch "Profil & Paramètres de Sécurité" design. Only what the API
 * knows: the identity of /api/auth/me, the clinics and this week's activity of the agenda, the rules of the account.
 * Read-only (no route edits a profile yet); the password changes on the space's password page.
 */
export default function ProfilePage() {
  const titleId = useId()
  const identityId = useId()
  const securityId = useId()
  const passwordId = useId()
  const sessionId = useId()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [week, setWeek] = useState<Week>({ status: 'loading' })

  useEffect(() => {
    let current = true
    const { from, to } = thisWeek(new Date())
    fetchWeek(from, to).then(
      (agenda) => current && setWeek({ status: 'ready', agenda }),
      () => current && setWeek({ status: 'error' }),
    )
    return () => {
      current = false
    }
  }, [])

  async function onLogout() {
    await logout()
    navigate(paths.login, { replace: true })
  }

  const fullName = user ? `${user.firstName} ${user.lastName}` : ''
  const agenda = week.status === 'ready' ? week.agenda : null
  const clinics = agenda ? [...agenda.clinics].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : []
  const booked = agenda?.items.filter((item) => item.status === 'BOOKED').length ?? 0
  const open = agenda?.items.filter((item) => item.status === 'OPEN').length ?? 0

  return (
    <section aria-labelledby={titleId} className={styles.page} data-width="wide">
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          <span className={styles.liveDot} aria-hidden="true" />
          Espace praticien
        </p>
        <h2 id={titleId} className={styles.title}>
          Profil &amp; sécurité
        </h2>
        <p className={styles.subtitle}>Vos informations de compte, votre mot de passe et la sécurité de votre connexion</p>
      </header>

      {agenda && (
        <ul className={styles.stats} aria-label="Votre activité">
          <li className={styles.stat} data-tone="1">
            <Building2 size={22} aria-hidden="true" className={styles.statIcon} />
            <span>
              <span className={styles.statLabel}>Réseau</span>
              <span className={styles.statValue}>{plural(clinics.length, 'clinique', 'cliniques')}</span>
            </span>
          </li>
          <li className={styles.stat} data-tone="2">
            <CalendarCheck size={22} aria-hidden="true" className={styles.statIcon} />
            <span>
              <span className={styles.statLabel}>Agenda</span>
              <span className={styles.statValue}>{booked} rendez-vous cette semaine</span>
            </span>
          </li>
          <li className={styles.stat} data-tone="3">
            <CalendarClock size={22} aria-hidden="true" className={styles.statIcon} />
            <span>
              <span className={styles.statLabel}>Disponibilités</span>
              <span className={styles.statValue}>
                {plural(open, 'créneau disponible', 'créneaux disponibles')}
              </span>
            </span>
          </li>
        </ul>
      )}

      <div className={styles.layout}>
        <section aria-labelledby={identityId} className={styles.card}>
          <div className={styles.who}>
            {user && <UserAvatar firstName={user.firstName} lastName={user.lastName} size="lg" />}
            <div>
              <h3 id={identityId} className={styles.name}>
                {fullName}
              </h3>
              <span className={styles.badge}>
                <BadgeCheck size={14} aria-hidden="true" />
                Praticien
              </span>
            </div>
          </div>

          <ReadOnlyField label="Nom complet" value={fullName} icon={<UserRound size={18} />} />
          <ReadOnlyField label="Adresse e-mail" value={user?.email ?? ''} icon={<Mail size={18} />} />

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Cliniques de rattachement</span>
            {week.status === 'loading' && <p className={styles.muted}>Chargement…</p>}
            {week.status === 'error' && (
              <p className={styles.muted}>Vos cliniques n’ont pas pu être chargées. Rechargez la page pour réessayer.</p>
            )}
            {agenda && (
              <ul className={styles.clinics} aria-label="Cliniques de rattachement">
                {clinics.map((clinic) => (
                  <li key={clinic.id} className={styles.clinic}>
                    {clinic.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className={styles.note}>
            Une information à corriger ? Pour la modifier, contactez l’administration de votre clinique.
          </p>
        </section>

        <div className={styles.side}>
          <section aria-labelledby={securityId} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
              <h3 id={securityId} className={styles.cardTitle}>
                Sécurité du compte
              </h3>
              <span className={styles.pill}>Activée</span>
            </div>
            <div className={styles.inset}>
              <strong className={styles.insetTitle}>Connexion en deux étapes</strong>
              <p className={styles.insetText}>
                À chaque connexion, un code à 6 chiffres de votre application d’authentification vous est demandé après
                le mot de passe.
              </p>
            </div>
          </section>

          <section aria-labelledby={passwordId} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <KeyRound size={20} />
              </span>
              <h3 id={passwordId} className={styles.cardTitle}>
                Mot de passe
              </h3>
            </div>
            <ul className={styles.rules}>
              <li>12 caractères ou plus</li>
              <li>Une majuscule, une minuscule, un chiffre et un caractère spécial</li>
              <li>Différent de votre adresse e-mail et de vos 3 derniers mots de passe</li>
            </ul>
            <p className={styles.muted}>Après un changement, vous êtes déconnecté de tous vos appareils.</p>
            <Link to={paths.practitioner.password} className={styles.secondaryAction}>
              <KeyRound size={18} aria-hidden="true" />
              Modifier le mot de passe
            </Link>
          </section>

          <section aria-labelledby={sessionId} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <Clock size={20} />
              </span>
              <h3 id={sessionId} className={styles.cardTitle}>
                Session
              </h3>
            </div>
            <div className={styles.inset}>
              <p className={styles.insetText}>
                Pour protéger les données de santé, vous êtes déconnecté après 15 minutes d’inactivité, et au plus tard
                après 10 heures.
              </p>
            </div>
            <button type="button" className={styles.dangerAction} onClick={onLogout}>
              <LogOut size={18} aria-hidden="true" />
              Se déconnecter
            </button>
          </section>
        </div>
      </div>
    </section>
  )
}
