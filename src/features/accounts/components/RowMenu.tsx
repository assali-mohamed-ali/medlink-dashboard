import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import styles from '../accounts.module.css'

export type RowAction = {
  key: string
  label: string
  hint: string
  icon: ReactNode
  /** "danger" for the risky one, shown last and in red; "safe" for enabling an account again. */
  tone?: 'danger' | 'safe'
  onSelect: () => void
}

type Props = {
  /** Who the row is: names the button and the menu ("Actions pour Sami Dev"). */
  name: string
  email: string
  actions: readonly RowAction[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One "⋯" button per account row instead of a button per action: it opens a menu (WAI-ARIA menu button) with the
 * person's name and e-mail, then the actions, the risky one last after a separator. Arrow keys move, Home and End jump,
 * Escape closes and gives the focus back to the button, a click outside closes. The menu is placed under the button
 * (position: fixed, so the scrolling table never cuts it) and closes when the page scrolls or resizes.
 */
export default function RowMenu({ name, email, actions, open, onOpenChange }: Props) {
  const menuId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const [place, setPlace] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !button.current) return
    const rect = button.current.getBoundingClientRect()
    setPlace({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) })
    // Without scrolling: a scroll closes the menu
    items.current[0]?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !button.current?.contains(target)) onOpenChange(false)
    }
    const close = (event: Event) => {
      // The table's own scroll or the page's moves the button away: close; a scroll inside the menu does not
      if (!menu.current?.contains(event.target as Node)) onOpenChange(false)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, onOpenChange])

  function closeAndFocus() {
    onOpenChange(false)
    button.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = items.current.filter((item): item is HTMLButtonElement => item !== null)
    const at = list.indexOf(document.activeElement as HTMLButtonElement)
    const moves: Record<string, number> = {
      ArrowDown: (at + 1) % list.length,
      ArrowUp: (at - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    }
    if (event.key in moves) {
      event.preventDefault()
      list[moves[event.key]]?.focus({ preventScroll: true })
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      closeAndFocus()
    }
  }

  const label = `Actions pour ${name}`
  // Enabling or disabling the account comes last, after a separator
  const safe = actions.filter((action) => !action.tone)
  const risky = actions.filter((action) => action.tone)

  function item(action: RowAction, index: number) {
    return (
      <button
        key={action.key}
        ref={(node) => {
          items.current[index] = node
        }}
        type="button"
        role="menuitem"
        tabIndex={-1}
        className={styles.menuItem}
        data-tone={action.tone}
        onClick={() => {
          onOpenChange(false)
          action.onSelect()
        }}
      >
        <span className={styles.menuIcon} aria-hidden="true">
          {action.icon}
        </span>
        <span className={styles.menuText}>
          <span data-label>{action.label}</span>
          <small>{action.hint}</small>
        </span>
      </button>
    )
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.kebab}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-open={open || undefined}
        onClick={() => onOpenChange(!open)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div ref={menu} id={menuId} role="menu" aria-label={label} className={styles.menu} style={place} onKeyDown={onKeyDown}>
          <div className={styles.menuHead} aria-hidden="true">
            <b>{name}</b>
            <small>{email}</small>
          </div>
          {safe.map((action, index) => item(action, index))}
          {risky.length > 0 && <div role="separator" className={styles.menuSeparator} />}
          {risky.map((action, index) => item(action, safe.length + index))}
        </div>
      )}
    </>
  )
}
