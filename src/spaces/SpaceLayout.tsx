import { Suspense, useEffect, useRef, useState } from 'react'
import { LogOut, Menu, Plus } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NotificationBell } from '@/features/alerts'
import { useAuth, type Role } from '@/features/auth'
import UserAvatar from '@/shared/components/UserAvatar'
import { paths } from '@/shared/config/paths'
import { Button, Skeleton } from '@/shared/ui'
import SectionNavigation from '@/shared/ui/SectionNavigation'
import { SPACES } from './spaces'
import styles from './SpaceLayout.module.css'

/**
 * The frame of a role's space: a skip link, task navigation, account controls and the current page.
 * On phones, the bottom bar exposes the primary tasks and opens the remaining links on demand.
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
  const dossier = [
    { to: paths.patient.results, label: 'Résultats' },
    { to: paths.patient.reports, label: 'Comptes-rendus du dossier' },
    { to: paths.patient.documents, label: 'Documents' },
  ]
  const appointments = [
    { to: paths.patient.appointments, label: 'Mes consultations' },
    { to: paths.patient.slots, label: 'Réserver un créneau' },
    { to: paths.patient.reassignments, label: 'Propositions de transfert' },
  ]
  const sectionNav = role === 'PATIENT'
    ? dossier.some(item => item.to === path) ? { label: 'Dossier médical', items: dossier }
      : appointments.some(item => item.to === path) ? { label: 'Gestion des rendez-vous', items: appointments }
      : null
    : null
  const groups = [...new Set(space.menu.map(entry => entry.group ?? 'Navigation'))]
  const shortcuts = space.menu.filter(entry => entry.mobileLabel)
  const mobileCurrent = active?.mobileParent ?? (active?.mobileLabel ? active.to : undefined)
  const hasMore = space.menu.some(entry => !entry.mobileLabel && !entry.mobileParent)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const shownPath = useRef(pathname)

  // After a move inside the space, focus the title so a screen reader announces the new page. Not on the first
  // page shown: the browser's own focus handling is right there (and StrictMode's second effect run changes nothing).
  useEffect(() => {
    if (shownPath.current === pathname) return
    shownPath.current = pathname
    setMenuOpen(false)
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
      <div className={styles.navigation} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
      }} onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false)
          menuToggle.current?.focus()
        }
      }}>
        <nav className={styles.shortcuts} aria-label="Navigation mobile">
          {shortcuts.map(({ to, mobileLabel, icon: Icon }) => (
            <Link key={to} to={to} aria-current={mobileCurrent === to ? 'page' : undefined}
              className={styles.shortcut} onClick={() => setMenuOpen(false)}>
              <Icon size={20} aria-hidden="true" />
              <span>{mobileLabel}</span>
            </Link>
          ))}
          {hasMore && (
            <button ref={menuToggle} type="button" className={styles.shortcut}
              aria-expanded={menuOpen} aria-controls="space-menu" data-current={Boolean(active && !mobileCurrent)}
              onClick={() => setMenuOpen(open => !open)}>
              <Menu size={20} aria-hidden="true" />
              <span>Plus</span>
            </button>
          )}
        </nav>
        <nav id="space-menu" data-open={menuOpen} className={styles.nav} aria-label="Menu de l’espace">
          <span className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">
              <Plus size={20} strokeWidth={3} />
            </span>
            <strong>MedLink</strong>
          </span>
          {groups.map(group => {
            const entries = space.menu.filter(entry => (entry.group ?? 'Navigation') === group)
            return (
              <div key={group} className={styles.group} data-desktop-only={entries.every(entry => entry.mobileLabel || entry.mobileParent)}>
                <p className={styles.groupLabel}>{group}</p>
                <ul className={styles.entries}>
                  {entries.map(({ label, to, icon: Icon, mobileLabel, mobileParent }) => (
                    <li key={to} data-desktop-only={Boolean(mobileLabel || mobileParent)}>
                      <Link to={to} aria-current={active?.to === to ? 'page' : undefined} className={styles.link}
                        onClick={() => {
                          setMenuOpen(false)
                          if (menuOpen && to === path) menuToggle.current?.focus()
                        }}>
                        <Icon size={19} aria-hidden="true" /><span>{label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
      </div>
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
            {sectionNav && <SectionNavigation label={sectionNav.label} items={sectionNav.items} />}
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
