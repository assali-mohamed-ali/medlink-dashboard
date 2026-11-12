import { useId } from 'react'
import type { ReactNode } from 'react'
import styles from './Card.module.css'

type Props = {
  /** With a title the card is a <section> named by it (a landmark screen readers can jump to). */
  title?: ReactNode
  /** The title's level in the page outline (h2 by default). */
  headingLevel?: 2 | 3 | 4
  /** One control at the top right (a link or a small button). */
  action?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}

/** A white box on the page: optional header (title, action), body, optional footer. */
export default function Card({ title, headingLevel = 2, action, footer, className, children }: Props) {
  const titleId = useId()
  const Heading = `h${headingLevel}` as const
  const Box = title ? 'section' : 'div'
  return (
    <Box className={[styles.card, className].filter(Boolean).join(' ')} aria-labelledby={title ? titleId : undefined}>
      {(title || action) && (
        <div className={styles.header}>
          {title && (
            <Heading id={titleId} className={styles.title}>
              {title}
            </Heading>
          )}
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </Box>
  )
}
