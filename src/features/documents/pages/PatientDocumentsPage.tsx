import { FolderOpen } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { Alert } from '@/shared/ui'
import DocumentsPanel from '../components/DocumentsPanel'
import styles from './DocumentsPages.module.css'

/** The patient's own documents (MLink-123/125): read and download only. */
export default function PatientDocumentsPage() {
  const { user } = useAuth()
  return (
    <section className={styles.patientDocuments}>
      <header className={styles.documentHeader}><div><h2>Mes documents</h2><p className={styles.intro}>Vos comptes rendus, ordonnances et résultats ajoutés par le personnel de la clinique.</p></div><span className={styles.documentIcon}><FolderOpen size={26} aria-hidden="true" /></span></header>
      {user ? (
        <DocumentsPanel patientId={user.id} canUpload={false} />
      ) : (
        <Alert tone="error">Votre session a expiré. Reconnectez-vous pour voir vos documents.</Alert>
      )}
    </section>
  )
}
