import Spinner from './Spinner'
import styles from './PageLoader.module.css'

/** Full-area loader while a page or the session loads. */
export default function PageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className={styles.loader}>
      <Spinner label={label} />
    </div>
  )
}
