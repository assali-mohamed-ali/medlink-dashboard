import { useEffect, useRef } from 'react'
import { LogOut, Plus } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, type Role } from '@/features/auth'
import UserAvatar from '@/shared/components/UserAvatar'
import { paths } from '@/shared/config/paths'
import { Button } from '@/shared/ui'
import { SPACES } from './spaces'
import styles from './SpaceLayout.module.css'

/**
 * The frame of a role's space (docs/ui-refresh/PLAN.md §4.5): a skip link, the space's menu (sidebar, icon rail from
 * 768 to 1023 px, bottom bar on phones: one <nav>, restyled), a top bar (the page title, who is logged in, logout in
 * one click) and the current page (<Outlet />). The route's guard has already checked the role.
 */
export default function SpaceLayout({ role }: { role: Role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const space = SPACES[role]
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shownPath = useRef(pathname)

  // After a move inside the space, focus the title so a screen reader announces the new page. Not on the first
  // page shown: the browser's own focus handling is right there (and StrictMode's second effect run changes nothing).
  useEffect(() => {
    if (shownPath.current === pathname) return
    shownPath.current = pathname
    titleRef.current?.focus()
  }, [pathname])

  async function onLogout() {
    await logout()
    navigate(paths.login, { replace: true })
  }

  return (
    <div className={styles.shell}>
      <a href="#contenu" className={styles.skip}>
        Aller au contenu
      </a>
      <nav className={styles.nav} aria-label="Menu de l’espace">
        <span className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <Plus size={18} strokeWidth={3} />
          </span>
          <strong className={styles.brandName}>MedLink</strong>
        </span>
        <ul className={styles.entries}>
          {space.menu.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
                className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
              >
                <Icon size={20} aria-hidden="true" />
                <span className={styles.label}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
            {space.title}
          </h1>
          <div className={styles.account}>
            {user && (
              <>
                <UserAvatar firstName={user.firstName} lastName={user.lastName} />
                <span className={styles.who}>
                  <span className={styles.name}>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={styles.role}>{space.roleLabel}</span>
                </span>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut size={18} aria-hidden="true" />
              <span className={styles.logoutLabel}>Se déconnecter</span>
            </Button>
          </div>
        </header>
        <main id="contenu" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
