import type { ComponentPropsWithRef } from 'react'
import Spinner from './Spinner'
import styles from './Button.module.css'

type Props = ComponentPropsWithRef<'button'> & {
  /** primary: the one main action of a screen; secondary (outline); ghost (text); danger: destructive actions. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Height 44 (sm), 48 (md) or 56 px (lg): every size is a full touch target. */
  size?: 'sm' | 'md' | 'lg'
  /** Stretch to the width of its container. */
  fullWidth?: boolean
  /** Shows a spinner, disables the button and marks it busy (e.g. while a request runs). */
  loading?: boolean
}

/** Our button: any native <button> prop works; `type` defaults to "button" (never an accidental submit). */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: Props) {
  const classes = [styles.button, styles[variant], styles[size], fullWidth && styles.full, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size="sm" label="En cours…" />}
      {children}
    </button>
  )
}
