import { PractitionerHome } from '@/features/agenda'
import { useAuth, type Role } from '@/features/auth'
import { PatientHome } from '@/features/slots'
import { StaffHome } from '@/features/staff-home'

/**
 * The first page of every space (PLAN.md §4.5): each role's home, after the Stitch design, shows its own data from
 * the API (the patient's appointments, the practitioner's agenda, the staff's accounts and audit trail), never fake data.
 */
export default function SpaceHome({ role }: { role: Role }) {
  const { user } = useAuth()
  if (role === 'PATIENT') return <PatientHome firstName={user?.firstName} />
  if (role === 'PRACTITIONER') return <PractitionerHome firstName={user?.firstName} />
  return <StaffHome firstName={user?.firstName} />
}
