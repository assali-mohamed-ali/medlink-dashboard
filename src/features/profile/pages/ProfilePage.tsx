import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  Clock,
  Info,
  KeyRound,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import { type Week as WeekData, fetchWeek, thisWeek } from '../api'
import styles from '../profile.module.css'

type Week = { status: 'loading' } | { status: 'ready'; agenda: WeekData } | { status: 'error' }

/** The clinics' colours of the agenda: one of three, in the order of their names. */
const TONES = 3

/** One line of the account information: an icon, what it is, its value. Text, not a field: nothing is edited here. */
function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factIcon} aria-hidden="true">
        {icon}
      </span>
      <div>
        <dt className={styles.factLabel}>{label}</dt>
        <dd className={styles.factValue}>{value}</dd>
      </div>
    </div>
  )
}

/** One count of the week, like the homes and "Mes rendez-vous". */
function Count({ icon, tint, n, label }: { icon: ReactNode; tint: string; n: number; label: string }) {
  return (
    <li className={styles.count}>
      <span className={`${styles.countIcon} ${tint}`}>{icon}</span>
      <span className={styles.countText}>
        <b>{n}</b>
        <span>{label}</span>
      </span>
    </li>
  )
}

/** One protection of the account, in the security card. */
function Protection({ icon, title, children, aside }: { icon: ReactNode; title: string; children: ReactNode; aside?: ReactNode }) {
  const id = useId()
  return (
    <li className={styles.protection} aria-labelledby={id}>
      <span className={styles.protectionIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.protectionText}>
        <h4 id={id} className={styles.protectionTitle}>
          {title}
        </h4>
        {children}
      </div>
      {aside}
    </li>
  )
}

/**
 * The practitioner's profile and security, in the Stitch family of the homes: who is logged in, the account as text
 * (no route edits a profile yet), the clinics in the agenda's colours, this week's counts, then one security card.
 * Only what the API knows: the identity of /api/auth/me, the clinics and this week of the agenda, the account's rules.
 */
export default function ProfilePage() {
  const headerId = useId()
  const accountId = useId()
  const securityId = useId()
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
  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : ''
  const agenda = week.status === 'ready' ? week.agenda : null
  const clinics = agenda ? [...agenda.clinics].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : []
  const booked = agenda?.items.filter((item) => item.status === 'BOOKED').length ?? 0
  const open = agenda?.items.filter((item) => item.status === 'OPEN').length ?? 0

  return (
    <div className={styles.page} data-width="wide">
      <section className={styles.hello} aria-labelledby={headerId}>
        <span className={styles.bigAvatar} aria-hidden="true">
          {initials}
        </span>
        <div className={styles.helloText}>
          <p id={headerId} className={styles.eyebrow}>
            <UserRound size={14} aria-hidden="true" />
            Mon profil
          </p>
          <h2 className={styles.title}>{fullName}</h2>
          <ul className={styles.badges}>
            <li className={styles.badgeMain}>
              <BadgeCheck size={14} aria-hidden="true" />
              Praticien
            </li>
            <li className={styles.badge}>
              <ShieldCheck size={14} aria-hidden="true" />
              Connexion en deux étapes activée
            </li>
            {user && (
              <li className={styles.badge}>
                <Mail size={14} aria-hidden="true" />
                <span>{user.email}</span>
              </li>
            )}
          </ul>
        </div>
      </section>

      {agenda && (
        <ul className={styles.counts} aria-label="Votre activité">
          <Count
            icon={<Building2 size={20} aria-hidden="true" />}
            tint={styles.blue}
            n={clinics.length}
            label={clinics.length > 1 ? 'Cliniques' : 'Clinique'}
          />
          <Count icon={<CalendarCheck size={20} aria-hidden="true" />} tint={styles.mint} n={booked} label="Rendez-vous cette semaine" />
          <Count
            icon={<CalendarClock size={20} aria-hidden="true" />}
            tint={styles.cream}
            n={open}
            label={open > 1 ? 'Créneaux disponibles' : 'Créneau disponible'}
          />
        </ul>
      )}

      <div className={styles.layout}>
        <section aria-labelledby={accountId} className={styles.card}>
          <div>
            <h3 id={accountId} className={styles.cardTitle}>
              Informations du compte
            </h3>
            <p className={styles.lead}>Ce que MedLink connaît de vous. Ces informations ne se modifient pas ici.</p>
          </div>
          <dl className={styles.facts}>
            <Fact icon={<UserRound size={18} />} label="Nom complet" value={fullName} />
            <Fact icon={<Mail size={18} />} label="Adresse e-mail" value={user?.email ?? ''} />
            <Fact icon={<BadgeCheck size={18} />} label="Rôle" value="Praticien" />
          </dl>

          <div>
            <p className={styles.sub}>Cliniques de rattachement</p>
            {week.status === 'loading' && <p className={styles.muted}>Chargement…</p>}
            {week.status === 'error' && (
              <p className={styles.muted}>Vos cliniques n’ont pas pu être chargées. Rechargez la page pour réessayer.</p>
            )}
            {agenda && (
              <ul className={styles.clinics} aria-label="Cliniques de rattachement">
                {clinics.map((clinic, index) => (
                  <li key={clinic.id} className={styles.clinic} data-tone={(index % TONES) + 1}>
                    <span className={styles.clinicDot} aria-hidden="true" />
                    {clinic.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className={styles.note}>
            <Info size={16} aria-hidden="true" />
            Une information à corriger ? Pour la modifier, contactez l’administration de votre clinique.
          </p>
        </section>

        <section aria-labelledby={securityId} className={styles.card}>
          <div>
            <h3 id={securityId} className={styles.cardTitle}>
              Sécurité
            </h3>
            <p className={styles.lead}>Votre connexion et vos données de santé sont protégées.</p>
          </div>
          <ul className={styles.protections}>
            <Protection
              icon={<ShieldCheck size={20} />}
              title="Connexion en deux étapes"
              aside={<span className={styles.on}>Activée</span>}
            >
              <p className={styles.protectionLine}>
                Un code à 6 chiffres de votre application d’authentification, après le mot de passe.
              </p>
            </Protection>
            <Protection
              icon={<KeyRound size={20} />}
              title="Mot de passe"
              aside={
                <Link to={paths.practitioner.password} className={styles.change} aria-label="Modifier le mot de passe">
                  Modifier
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              }
            >
              <p className={styles.protectionLine}>Après un changement, vous êtes déconnecté de tous vos appareils.</p>
              <ul className={styles.rules} aria-label="Règles du mot de passe">
                <li>12 caractères ou plus</li>
                <li>Une majuscule et une minuscule</li>
                <li>Un chiffre et un caractère spécial</li>
                <li>Différent de votre e-mail et de vos 3 derniers</li>
              </ul>
            </Protection>
            <Protection icon={<Clock size={20} />} title="Session">
              <p className={styles.protectionLine}>
                Pour protéger les données de santé, vous êtes déconnecté après 15 minutes d’inactivité, et au plus tard
                après 10 heures.
              </p>
            </Protection>
          </ul>
          <button type="button" className={styles.logout} onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />
            Se déconnecter
          </button>
        </section>
      </div>
    </div>
  )
}
