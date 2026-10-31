import styles from './Spinner.module.css'

type Props = {
  /** What is happening, for screen readers. */
  label?: string
  size?: 'sm' | 'md'
}

/** A spinning ring announced as a status ("Chargement…" by default). */
export default function Spinner({ label = 'Chargement…', size = 'md' }: Props) {
  return (
    <span role="status" className={styles.wrap}>
      <span className={`${styles.ring} ${styles[size]}`} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  )
}
