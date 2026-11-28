import { NavLink } from 'react-router-dom'
import styles from './SectionNavigation.module.css'

/** Navigation between real feature routes, without duplicate tab state. */
export default function SectionNavigation({ label, items }: { label: string; items: readonly { to: string; label: string }[] }) {
  return <nav aria-label={label} className={styles.nav}>
    {items.map(item => <NavLink key={item.to} to={item.to} end className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>{item.label}</NavLink>)}
  </nav>
}
