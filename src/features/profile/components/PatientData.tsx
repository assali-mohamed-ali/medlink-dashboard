import { useEffect, useState } from 'react'
import { messageFor } from '@/shared/api/errors'
import { Button, Card } from '@/shared/ui'
import { deletionRequest, exportPatientData, type DeletionRequest } from '../api'

export default function PatientData() {
  const [request, setRequest] = useState<DeletionRequest>()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let current = true
    deletionRequest().then(
      (data) => { if (current) setRequest(data) },
      (cause) => { if (current) setError(messageFor(cause)) },
    )
    return () => { current = false }
  }, [])

  async function run(operation: 'export' | 'request' | 'cancel') {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (operation === 'export') {
        const { blob } = await exportPatientData()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'medlink-export.json'
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setNotice('Téléchargement de votre export lancé.')
      } else if (operation === 'cancel') {
        await deletionRequest('DELETE')
        setRequest(await deletionRequest())
        setNotice('Demande retirée.')
      } else {
        setRequest(await deletionRequest('POST'))
        setConfirming(false)
        setNotice('Demande transmise.')
      }
    } catch (cause) {
      setError(messageFor(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Mes données">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p>Exportez vos données au format JSON. Les fichiers médicaux sont téléchargeables depuis Mes documents.</p>
      <Button disabled={busy} onClick={() => void run('export')}>Télécharger mes données</Button>
      {!request && !error && <p role="status">Chargement de votre demande…</p>}
      {request && !request.requested && !confirming && (
        <Button disabled={busy} onClick={() => setConfirming(true)}>Demander la suppression</Button>
      )}
      {confirming && (
        <div>
          <p>Le personnel examinera votre demande. Votre compte et vos données restent disponibles pendant cet examen.</p>
          <Button disabled={busy} onClick={() => void run('request')}>Confirmer la demande</Button>
          <Button disabled={busy} onClick={() => setConfirming(false)}>Annuler</Button>
        </div>
      )}
      {request?.status === 'PENDING' && (
        <>
          <p>Votre demande est en cours de traitement.</p>
          <Button disabled={busy} onClick={() => void run('cancel')}>Retirer la demande</Button>
        </>
      )}
      {request?.status === 'APPROVED' && <p>Votre demande est approuvée. Le compte reste accessible.</p>}
      {request?.status === 'REJECTED' && <p>Votre demande a été refusée. {request.decisionNote}</p>}
    </Card>
  )
}
