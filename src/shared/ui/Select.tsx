import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import fieldStyles from './TextField.module.css'
import styles from './Select.module.css'

type Props = ComponentPropsWithRef<'select'> & {
  label: ReactNode
  hint?: ReactNode
  /** Error under the field: announced (role alert), and the select is marked invalid. */
  error?: string
  /** The <option> elements. */
  children: ReactNode
}

/**
 * A native <select> (keyboard, screen readers and phones handle it for free), styled like TextField. Any native prop
 * works, including what react-hook-form's `register()` returns.
 */
export default function Select({ label, hint, error, id, className, children, ...rest }: Props) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const describedBy = [rest['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={[fieldStyles.field, className].filter(Boolean).join(' ')}>
      <label className={fieldStyles.label} htmlFor={selectId}>
        {label}
      </label>
      <div className={fieldStyles.control}>
        <select
          {...rest}
          id={selectId}
          className={`${fieldStyles.input} ${styles.select}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
        >
          {children}
        </select>
        <ChevronDown className={styles.chevron} size={18} aria-hidden="true" />
      </div>
      {hint && (
        <p id={hintId} className={fieldStyles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={fieldStyles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
