import { Suspense, useEffect, useRef, useState } from 'react'
import { LogOut, Menu, Plus } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NotificationBell } from '@/features/alerts'
import { useAuth, type Role } from '@/features/auth'
import UserAvatar from '@/shared/components/UserAvatar'
import { paths } from '@/shared/config/paths'
import { Button, Skeleton } from '@/shared/ui'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuToggle = useRef<HTMLButtonElement>(null)
  const path = pathname.replace(/\/+$/, '') || '/'
  const active = space.menu.find(entry => entry.to === path)
    ?? space.menu.find(entry => entry.also?.includes(path))
    ?? [...space.menu].sort((a, b) => b.to.length - a.to.length).find(entry => entry.to !== space.menu[0].to && path.startsWith(entry.to + '/'))
  const groups = [...new Set(space.menu.map(entry => entry.group ?? 'Navigation'))]
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
      <button ref={menuToggle} type="button" className={styles.menuToggle} aria-expanded={menuOpen} aria-controls="space-menu" onClick={() => setMenuOpen(open => !open)}><Menu size={20} aria-hidden="true" /> Menu</button>
      <nav id="space-menu" data-open={menuOpen} className={styles.nav} aria-label="Menu de l’espace" onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuToggle.current?.focus() }
      }}>
        <span className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            <Plus size={20} strokeWidth={3} />
          </span>
          <strong className={styles.brandName}>MedLink</strong>
        </span>
        {groups.map(group => (
          <div key={group} className={styles.group}>
            <p className={styles.groupLabel}>{group}</p>
            <ul className={styles.entries}>
              {space.menu.filter(entry => (entry.group ?? 'Navigation') === group).map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} title={label} aria-current={active?.to === to ? 'page' : undefined}
                    className={active?.to === to ? `${styles.link} ${styles.active}` : styles.link}
                    onClick={() => setMenuOpen(false)}>
                    <Icon size={19} aria-hidden="true" /><span className={styles.label}>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
              {space.title}
            </h1>
            {active && <span className={styles.context}>{active.label}</span>}
          </div>
          <div className={styles.account}>
            {/* MLink-37: the practitioner's alerts (cancelled appointments) */}
            {role === 'PRACTITIONER' && <NotificationBell />}
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
            {/* A space page is its own chunk: the frame stays while it loads */}
            <Suspense fallback={<Skeleton label="Chargement de la page" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
