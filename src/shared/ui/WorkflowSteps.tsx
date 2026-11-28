import styles from './WorkflowSteps.module.css'

/** Read-only progress; actual transitions stay in the calling feature. */
export default function WorkflowSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  return <ol className={styles.steps} aria-label="Étapes du parcours">
    {steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined} data-complete={index < current || undefined}><span aria-hidden="true">{index < current ? '✓' : index + 1}</span><span>{step}</span></li>)}
  </ol>
}
