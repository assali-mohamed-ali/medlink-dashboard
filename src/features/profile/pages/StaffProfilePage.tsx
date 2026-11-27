import { BadgeCheck, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import { AccountCard, Badge, ProfileHero, Protection, SecurityCard } from '../components/ProfileParts'
import styles from '../profile.module.css'

/**
 * The staff's profile, like the practitioner's and the patient's (Stitch family of the homes): who is logged in, the
 * account as text (no route edits it yet), and one security card. The staff logs in with a second step (a 6-digit
 * code), so it is said to be on; the password changes on the space's password page, which leads back here.
 */
export default function StaffProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate(paths.login, { replace: true })
  }

  const fullName = user ? `${user.firstName} ${user.lastName}` : ''
  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : ''

  return (
    <div className={styles.page} data-width="wide">
      <ProfileHero
        initials={initials}
        name={fullName}
        badges={
          <>
            <Badge main icon={<BadgeCheck size={14} aria-hidden="true" />}>
              Personnel administratif
            </Badge>
            {user && <Badge icon={<Mail size={14} aria-hidden="true" />}>{user.email}</Badge>}
          </>
        }
      />

      <div className={styles.layout}>
        <AccountCard
          name={fullName}
          email={user?.email ?? ''}
          role="Personnel administratif"
          whom="un autre membre du personnel administratif"
        />
        <SecurityCard passwordPath={paths.staff.password} onLogout={onLogout}>
          <Protection
            icon={<ShieldCheck size={20} />}
            title="Connexion en deux étapes"
            aside={<span className={styles.on}>Activée</span>}
          >
            <p className={styles.protectionLine}>
              Un code à 6 chiffres de votre application d’authentification, après le mot de passe.
            </p>
          </Protection>
        </SecurityCard>
      </div>
    </div>
  )
}
