import type { ReactNode } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/shared/config/paths'
import styles from './AuthFrame.module.css'

export default function AuthFrame({ children, context, description, header = false }: {
  children: ReactNode; context: string; description: string; header?: boolean
}) {
  return <main className={styles.frame} data-header={header || undefined}>
    <div className={styles.layout}>
      <aside className={styles.intro} aria-label="À propos de votre accès">
        <Link to={paths.home} className={styles.brand} aria-label="MedLink, retour à l’accueil"><span><Plus size={25} aria-hidden="true" /></span>MedLink</Link>
        <div className={styles.message}>
          <p className={styles.kicker}>{context}</p>
          <p className={styles.headline}>Votre santé,<br />en toute confiance.</p>
          <p className={styles.description}>{description}</p>
        </div>
        <p className={styles.note}><ShieldCheck size={20} aria-hidden="true" /> Accès personnel et confidentialité</p>
      </aside>
      <div className={styles.form}>{children}</div>
    </div>
    <footer className={styles.footer}>MedLink · Réseau de cliniques</footer>
  </main>
}
