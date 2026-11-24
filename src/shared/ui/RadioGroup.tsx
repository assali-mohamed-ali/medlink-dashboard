import { useId } from 'react'
import type { ReactNode } from 'react'
import styles from './Choice.module.css'

type Option = { value: string; label: ReactNode; disabled?: boolean }

type Props = {
  /** Names the group (a <fieldset> with its <legend>). */
  legend: ReactNode
  /** The radios' shared name: one choice at a time, arrow keys move between them (native behaviour). */
  name: string
  options: Option[]
  /** Controlled value; leave it out (and use defaultValue) for an uncontrolled group. */
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  hint?: ReactNode
  /** Error under the group: announced (role alert) and describes the group. */
  error?: string
  required?: boolean
  className?: string
}

/** A set of native radios in a fieldset, restyled like Checkbox. */
export default function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
  required,
  className,
}: Props) {
  const groupId = useId()
  const hintId = hint ? `${groupId}-hint` : undefined
  const errorId = error ? `${groupId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <fieldset className={[styles.group, className].filter(Boolean).join(' ')} aria-describedby={describedBy}>
      <legend className={styles.legend}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.choice}>
          <input
            type="radio"
            className={styles.input}
            name={name}
            value={option.value}
            disabled={option.disabled}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            {...(value !== undefined ? { checked: value === option.value } : { defaultChecked: defaultValue === option.value })}
            onChange={(event) => onChange?.(event.target.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
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
    </fieldset>
  )
}
