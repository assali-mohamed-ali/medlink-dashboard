import { useAuth } from '@/features/auth'

/** The first page of every space until its features add their own. */
export default function SpaceHome() {
  const { user } = useAuth()
  return <p>Bienvenue{user ? `, ${user.firstName}` : ''}.</p>
}
