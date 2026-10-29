import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'

export default function SpacePage({ title }: { title: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/connexion', { replace: true })
  }

  return (
    <main>
      <h1>{title}</h1>
      {user && (
        <p>
          Connecté : {user.firstName} {user.lastName}
        </p>
      )}
      <button type="button" onClick={onLogout}>
        Se déconnecter
      </button>
    </main>
  )
}
