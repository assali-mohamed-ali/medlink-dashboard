import { useId, type ReactNode } from 'react'
import { BadgeCheck, ChevronRight, Clock, Info, KeyRound, LogOut, Mail, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from '../profile.module.css'

// The parts the practitioner's and the patient's profiles share (Stitch family of the homes). Only what the API knows.

/** Who is logged in: the initials, "Mon profil", the name as the page title, then the badges. */
export function ProfileHero({ initials, name, badges }: { initials: string; name: string; badges: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.hello} aria-labelledby={id}>
      <span className={styles.bigAvatar} aria-hidden="true">
        {initials}
      </span>
      <div className={styles.helloText}>
        <p id={id} className={styles.eyebrow}>
          <UserRound size={14} aria-hidden="true" />
          Mon profil
        </p>
        <h2 className={styles.title}>{name}</h2>
        <ul className={styles.badges}>{badges}</ul>
      </div>
    </section>
  )
}

/** A badge of the header; `main` is the role. */
export function Badge({ icon, main, children }: { icon: ReactNode; main?: boolean; children: ReactNode }) {
  return (
    <li className={main ? styles.badgeMain : styles.badge}>
      {icon}
      <span>{children}</span>
    </li>
  )
}

/** One count, like the homes and "Mes rendez-vous". */
export function Count({ icon, tint, n, label }: { icon: ReactNode; tint: string; n: number; label: string }) {
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

/** The account as text (no route edits a profile yet), then what the space adds, then whom to ask for a correction. */
export function AccountCard({
  name,
  email,
  role,
  whom,
  children,
}: {
  name: string
  email: string
  role: string
  /** Whom to ask: "l’administration de votre clinique", "l’accueil de votre clinique". */
  whom: string
  children?: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={styles.card}>
      <div>
        <h3 id={id} className={styles.cardTitle}>
          Informations du compte
        </h3>
        <p className={styles.lead}>Ce que MedLink connaît de vous. Ces informations ne se modifient pas ici.</p>
      </div>
      <dl className={styles.facts}>
        <Fact icon={<UserRound size={18} />} label="Nom complet" value={name} />
        <Fact icon={<Mail size={18} />} label="Adresse e-mail" value={email} />
        <Fact icon={<BadgeCheck size={18} />} label="Rôle" value={role} />
      </dl>
      {children}
      <p className={styles.note}>
        <Info size={16} aria-hidden="true" />
        Une information à corriger ? Pour la modifier, contactez {whom}.
      </p>
    </section>
  )
}

/** One protection of the account, in the security card. */
export function Protection({ icon, title, children, aside }: { icon: ReactNode; title: string; children: ReactNode; aside?: ReactNode }) {
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

/** One security card: what the space adds first (the second step of the staff), the password, the session, logout. */
export function SecurityCard({ passwordPath, onLogout, children }: { passwordPath: string; onLogout: () => void; children?: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={styles.card}>
      <div>
        <h3 id={id} className={styles.cardTitle}>
          Sécurité
        </h3>
        <p className={styles.lead}>Votre connexion et vos données de santé sont protégées.</p>
      </div>
      <ul className={styles.protections}>
        {children}
        <Protection
          icon={<KeyRound size={20} />}
          title="Mot de passe"
          aside={
            <Link to={passwordPath} className={styles.change} aria-label="Modifier le mot de passe">
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
            Pour protéger les données de santé, vous êtes déconnecté après 15 minutes d’inactivité, et au plus tard après
            10 heures.
          </p>
        </Protection>
      </ul>
      <button type="button" className={styles.logout} onClick={onLogout}>
        <LogOut size={18} aria-hidden="true" />
        Se déconnecter
      </button>
    </section>
  )
}
