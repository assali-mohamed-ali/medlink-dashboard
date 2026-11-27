import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { bookForPatient, fetchStaffSlotFilters, searchBookingPatients, searchStaffSlots } from '../api'
import StaffBookingPage from './StaffBookingPage'

vi.mock('../api', () => ({
  bookForPatient: vi.fn(),
  fetchStaffSlotFilters: vi.fn(),
  searchBookingPatients: vi.fn(),
  searchStaffSlots: vi.fn(),
}))

test('staff reviews the selected patient and slot before booking on their behalf', async () => {
  const clinic = { id: 'c1', name: 'Clinique Test', city: 'Tunis' }
  const practitioner = { id: 'doctor', firstName: 'Sami', lastName: 'Test', specialtyId: 's1', clinicIds: ['c1'] }
  const startsAt = '2026-12-05T08:00:00Z'
  const endsAt = '2026-12-05T08:30:00Z'
  vi.mocked(fetchStaffSlotFilters).mockResolvedValue({ clinics: [clinic], practitioners: [practitioner], specialties: [] })
  vi.mocked(searchBookingPatients).mockResolvedValue({ total: 1, items: [{
    id: 'patient', firstName: 'Amel', lastName: 'Test', email: 'amel@example.test',
    role: 'PATIENT', enabled: true, emailVerified: true,
  }] })
  vi.mocked(searchStaffSlots).mockResolvedValue({
    total: 1, items: [{ slotId: 'slot', clinic, practitioner, startsAt, endsAt, specialty: 'Médecine' }],
  })
  vi.mocked(bookForPatient).mockResolvedValue({
    id: 'reservation', clinic, practitioner, startsAt, endsAt, status: 'BOOKED',
  })
  render(<StaffBookingPage />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Nom ou e-mail du patient'), 'Amel')
  await user.click(screen.getByRole('button', { name: 'Rechercher un patient' }))
  await user.click(await screen.findByRole('button', { name: /Amel Test/ }))
  fireEvent.change(screen.getByLabelText('Date en Tunisie'), { target: { value: '2026-12-05' } })
  await user.click(screen.getByRole('button', { name: 'Chercher les créneaux' }))
  await user.click(await screen.findByRole('button', { name: /Clinique Test · Sami Test/ }))
  expect(bookForPatient).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: 'Confirmer la réservation' }))
  expect(bookForPatient).toHaveBeenCalledOnce()
  expect(bookForPatient).toHaveBeenCalledWith('patient', 'slot')
  expect(await screen.findByText('Référence reservation')).toBeVisible()
})
