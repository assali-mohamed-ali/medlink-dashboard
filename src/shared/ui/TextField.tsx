import { useId, useState } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import styles from './TextField.module.css'

export type TextFieldProps = ComponentPropsWithRef<'input'> & {
  /** Visible label; it names the input for screen readers too. May hold an icon. */
  label: ReactNode
  /** Help shown under the field, read with it. */
  hint?: ReactNode
  /** Error under the field: announced (role alert), and the field is marked invalid. */
  error?: string
  /** Something inside the field on the right (e.g. PasswordField's toggle). */
  endAdornment?: ReactNode
}

/**
 * Label + input + hint + error, wired for accessibility. Any native <input> prop works, including the
 * `ref` and handlers react-hook-form's `register()` returns: `<TextField label="Nom" {...register('lastName')} />`.
 * With `maxLength`, a count ("7 / 100 caractères") is shown and read with the field.
 */
export default function TextField({
  label,
  hint,
  error,
  endAdornment,
  id,
  className,
  onChange,
  ...rest
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  // Typed length for an uncontrolled field; a controlled one (`value`) is measured directly
  const [typed, setTyped] = useState(() => String(rest.value ?? rest.defaultValue ?? '').length)
  const length = rest.value !== undefined ? String(rest.value).length : typed
  const hintId = hint ? `${inputId}-hint` : undefined
  const countId = rest.maxLength !== undefined ? `${inputId}-count` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy =
    [rest['aria-describedby'], hintId, countId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          {...rest}
          id={inputId}
          className={endAdornment ? `${styles.input} ${styles.withEnd}` : styles.input}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          onChange={(event) => {
            setTyped(event.target.value.length)
            onChange?.(event)
          }}
        />
        {endAdornment && <span className={styles.end}>{endAdornment}</span>}
      </div>
      {(hint || countId) && (
        <div className={styles.footer}>
          {hint && (
            <p id={hintId} className={styles.hint}>
              {hint}
            </p>
          )}
          {countId && (
            <p id={countId} className={styles.count}>
              {length} / {rest.maxLength} caractères
            </p>
          )}
        </div>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
