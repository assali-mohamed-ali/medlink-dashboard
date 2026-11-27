import { useEffect, useState } from 'react'
import { BadgeCheck, CalendarCheck, CalendarX, Mail, RotateCcwClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import { type MyAppointments, fetchMyAppointments } from '../api'
import { AccountCard, Badge, Count, ProfileHero, SecurityCard } from '../components/ProfileParts'
import PatientDetails from '../components/PatientDetails'
import PatientData from '../components/PatientData'
import NotificationPreferences from '../components/NotificationPreferences'
import styles from '../profile.module.css'

/** The API's largest page: the counts are those of the latest 50 appointments, and the page says so beyond. */
const PAGE_SIZE = 50

type Load = { status: 'loading' } | { status: 'ready'; appointments: MyAppointments } | { status: 'error' }

/**
 * The patient's profile, like the practitioner's (Stitch family of the homes): who is logged in, the account as text
 * (no route edits it yet), the counts of their appointments, one security card with the way to the password page.
 * Only what the API knows: a patient has no second step at login, so none is said to be on.
 */
export default function PatientProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  // Read once: "now" does not move while the page is open
  const [now] = useState(() => Date.now())
  const [load, setLoad] = useState<Load>({ status: 'loading' })

  useEffect(() => {
    let current = true
    fetchMyAppointments(0, PAGE_SIZE).then(
      (appointments) => current && setLoad({ status: 'ready', appointments }),
      () => current && setLoad({ status: 'error' }),
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
  const page = load.status === 'ready' ? load.appointments : null
  const items = page?.items ?? []
  const cancelled = items.filter((a) => a.status === 'CANCELLED').length
  const past = items.filter((a) => a.status !== 'CANCELLED' && Date.parse(a.startsAt) <= now).length
  const toCome = items.length - cancelled - past

  return (
    <div className={styles.page} data-width="wide">
      <ProfileHero
        initials={initials}
        name={fullName}
        badges={
          <>
            <Badge main icon={<BadgeCheck size={14} aria-hidden="true" />}>
              Patient
            </Badge>
            {user && <Badge icon={<Mail size={14} aria-hidden="true" />}>{user.email}</Badge>}
          </>
        }
      />

      {load.status === 'error' && (
        <p className={styles.muted}>Vos rendez-vous n’ont pas pu être comptés. Rechargez la page pour réessayer.</p>
      )}
      {page && (
        <div className={styles.countsBlock}>
          <ul className={styles.counts} aria-label="Vos rendez-vous">
            <Count icon={<CalendarCheck size={20} aria-hidden="true" />} tint={styles.mint} n={toCome} label="À venir" />
            <Count
              icon={<CalendarX size={20} aria-hidden="true" />}
              tint={styles.rose}
              n={cancelled}
              label={cancelled > 1 ? 'Annulés' : 'Annulé'}
            />
            <Count
              icon={<RotateCcwClock size={20} aria-hidden="true" />}
              tint={styles.lavender}
              n={past}
              label={past > 1 ? 'Passés' : 'Passé'}
            />
          </ul>
          {page.total > items.length && (
            <p className={styles.muted}>Comptés sur vos {items.length} derniers rendez-vous.</p>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <AccountCard name={fullName} email={user?.email ?? ''} role="Patient" whom="l’accueil de votre clinique" />
        <SecurityCard passwordPath={paths.patient.password} onLogout={onLogout} />
        <PatientDetails />
        <NotificationPreferences />
        <PatientData />
      </div>
    </div>
  )
}
