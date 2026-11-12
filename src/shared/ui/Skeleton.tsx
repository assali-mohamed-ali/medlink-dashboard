import styles from './Skeleton.module.css'

type Props = {
  /** Number of grey lines (the last one is shorter, like the end of a paragraph). */
  lines?: number
  /** What is loading, read once by screen readers. */
  label?: string
}

/** Grey placeholder lines while page content loads (a Spinner stays for buttons). */
export default function Skeleton({ lines = 3, label = 'Chargement…' }: Props) {
  return (
    <div role="status" className={styles.skeleton}>
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true" className={styles.lines}>
        {Array.from({ length: lines }, (_, index) => (
          <span key={index} className={styles.line} />
        ))}
      </div>
    </div>
  )
}
