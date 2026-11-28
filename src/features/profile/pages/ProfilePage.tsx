import { useEffect, useState } from 'react'
import { BadgeCheck, Building2, CalendarCheck, CalendarClock, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import { type Week as WeekData, fetchWeek, thisWeek } from '../api'
import { AccountCard, Badge, Count, ProfileHero, Protection, SecurityCard } from '../components/ProfileParts'
import styles from '../profile.module.css'

type Week = { status: 'loading' } | { status: 'ready'; agenda: WeekData } | { status: 'error' }

/** The clinics' colours of the agenda: one of three, in the order of their names. */
const TONES = 3

/**
 * The practitioner's profile and security, in the Stitch family of the homes: who is logged in, the account as text
 * (no route edits a profile yet), the clinics in the agenda's colours, this week's counts, then one security card.
 * Only what the API knows: the identity of /api/auth/me, the clinics and this week of the agenda, the account's rules.
 */
export default function ProfilePage() {
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
      <ProfileHero
        initials={initials}
        name={fullName}
        badges={
          <>
            <Badge main icon={<BadgeCheck size={14} aria-hidden="true" />}>
              Praticien
            </Badge>
            <Badge icon={<ShieldCheck size={14} aria-hidden="true" />}>Connexion en deux étapes activée</Badge>
            {user && <Badge icon={<Mail size={14} aria-hidden="true" />}>{user.email}</Badge>}
          </>
        }
      />

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

      <nav aria-label="Rubriques du profil" className={styles.sectionLinks}><a href="#compte-identite">Informations</a><a href="#compte-securite">Sécurité</a></nav>
      <div className={styles.settings}>
        <div id="compte-identite" className={styles.settingGroup}><AccountCard name={fullName} email={user?.email ?? ''} role="Praticien" whom="l’administration de votre clinique">
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
        </AccountCard></div>
        <div id="compte-securite" className={styles.settingGroup}><SecurityCard passwordPath={paths.practitioner.password} onLogout={onLogout}>
          <Protection
            icon={<ShieldCheck size={20} />}
            title="Connexion en deux étapes"
            aside={<span className={styles.on}>Activée</span>}
          >
            <p className={styles.protectionLine}>
              Un code à 6 chiffres de votre application d’authentification, après le mot de passe.
            </p>
          </Protection>
        </SecurityCard></div>
      </div>
    </div>
  )
}
