import { LogOut, Plus } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, type Role } from '@/features/auth'
import { paths } from '@/shared/config/paths'
import { Button } from '@/shared/ui'
import { SPACES } from './spaces'
import styles from './SpaceLayout.module.css'

/**
 * The frame of a role's space: header (brand, the space's title, who is logged in, logout), the space's menu,
 * and the current page (<Outlet />). The route's guard has already checked the role.
 */
export default function SpaceLayout({ role }: { role: Role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const space = SPACES[role]

  async function onLogout() {
    await logout()
    navigate(paths.login, { replace: true })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <Plus size={18} strokeWidth={3} />
          </span>
          <strong>MedLink</strong>
        </span>
        <h1 className={styles.title}>{space.title}</h1>
        <div className={styles.account}>
          {user && (
            <span className={styles.user}>
              {user.firstName} {user.lastName}
            </span>
          )}
          <Button variant="secondary" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" />
            Se déconnecter
          </Button>
        </div>
      </header>
      <div className={styles.body}>
        <nav className={styles.menu} aria-label="Menu de l’espace">
          <ul>
            {space.menu.map((entry) => (
              <li key={entry.to}>
                <NavLink
                  to={entry.to}
                  end
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
                >
                  {entry.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
