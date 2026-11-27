import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import styles from './Choice.module.css'

type Props = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  /** The words next to the box; clicking them toggles it. */
  label: ReactNode
  hint?: ReactNode
  /** Error under the box: announced (role alert), and the box is marked invalid. */
  error?: string
}

/** A native checkbox, restyled; any native prop works, including what react-hook-form's `register()` returns. */
export default function Checkbox({ label, hint, error, id, className, ...rest }: Props) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [rest['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label className={styles.choice} htmlFor={inputId}>
        <input
          {...rest}
          id={inputId}
          type="checkbox"
          className={styles.input}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
