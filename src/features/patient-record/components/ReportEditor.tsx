import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '@/shared/api/apiClient'
import { fieldErrors, messageFor } from '@/shared/api/errors'
import { Alert, Button } from '@/shared/ui'
import { createReport } from '../api'
import type { Report } from '../types'
import styles from '../record.module.css'

/** The longest report the API takes (MLink-32, 32.3). */
export const REPORT_MAX_LENGTH = 10_000

type Props = {
  patientId: string
  onSaved: (report: Report) => void
  onCancel: () => void
}

/**
 * MLink-32 (32.5, 32.6): writes a consultation report. The draft lives in this component's state only (medical data:
 * never in the browser's storage); a failed save keeps it, says so, and "Réessayer" sends it again.
 */
export default function ReportEditor({ patientId, onSaved, onCancel }: Props) {
  const fieldId = useId()
  const [content, setContent] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const field = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    field.current?.focus()
  }, [])

  async function save() {
    if (savingRef.current) return
    if (!content.trim()) {
      setFieldError('Écrivez le compte-rendu avant de l’enregistrer.')
      return
    }
    savingRef.current = true
    setSaving(true)
    setFieldError(null)
    setFailure(null)
    try {
      onSaved(await createReport(patientId, { content }))
    } catch (error) {
      const perField =
        error instanceof ApiError && error.code === 'VALIDATION_FAILED' ? fieldErrors(error.details, ['content'] as const) : {}
      if (perField.content) setFieldError(perField.content)
      else setFailure(messageFor(error))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save()
  }

  const hintId = `${fieldId}-count`
  const errorId = `${fieldId}-error`

  return (
    <form aria-label="Nouveau compte-rendu" className={styles.editor} noValidate onSubmit={submit}>
      {failure && (
        <div className={styles.failure}>
          <Alert tone="error" title="Enregistrement impossible, votre brouillon est conservé.">
            {failure}
          </Alert>
          <Button variant="secondary" size="sm" onClick={() => void save()} disabled={saving}>
            Réessayer
          </Button>
        </div>
      )}
      <label htmlFor={fieldId} className={styles.fieldLabel}>
        Compte-rendu
      </label>
      <textarea
        ref={field}
        id={fieldId}
        className={styles.textarea}
        value={content}
        maxLength={REPORT_MAX_LENGTH}
        rows={10}
        aria-invalid={fieldError ? 'true' : 'false'}
        aria-describedby={[hintId, fieldError ? errorId : null].filter(Boolean).join(' ')}
        onChange={(event) => setContent(event.target.value)}
      />
      <p id={hintId} className={styles.count}>
        {content.length} / {REPORT_MAX_LENGTH} caractères
      </p>
      {fieldError && (
        <p id={errorId} className={styles.fieldError} role="alert">
          {fieldError}
        </p>
      )}
      <div className={styles.editorActions}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
