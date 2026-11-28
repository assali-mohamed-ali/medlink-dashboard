import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApiError } from '@/shared/api/apiClient'
import * as api from '../api'
import NotificationPreferences from './NotificationPreferences'

// US-15: the patient's optional mails, one test per API answer (read, saved, refused).
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  fetchNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
}))
const fetchPreferences = vi.mocked(api.fetchNotificationPreferences)
const savePreferences = vi.mocked(api.saveNotificationPreferences)

beforeEach(() => {
  vi.resetAllMocks()
  fetchPreferences.mockResolvedValue({ appointmentReminders: true, examResults: true })
})

test('both optional mails are shown as they are stored, and nothing is saved before a change', async () => {
  render(<NotificationPreferences />)

  expect(await screen.findByRole('checkbox', { name: /Rappel par e-mail/ })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: /nouveau résultat/ })).toBeChecked()
  expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeDisabled()
  expect(screen.getByText(/confirmation d’un rendez-vous est toujours envoyée/)).toBeInTheDocument()
})

test('turning reminders off sends both values and says it is saved', async () => {
  savePreferences.mockResolvedValue({ appointmentReminders: false, examResults: true })
  render(<NotificationPreferences />)

  await userEvent.click(await screen.findByRole('checkbox', { name: /Rappel par e-mail/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer mes préférences' }))

  expect(savePreferences).toHaveBeenCalledWith({ appointmentReminders: false, examResults: true })
  expect(await screen.findByRole('status')).toHaveTextContent('Vos préférences de notification ont été enregistrées.')
  expect(screen.getByRole('checkbox', { name: /Rappel par e-mail/ })).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeDisabled()
})

test('a refused save is announced and the stored choice stays the reference', async () => {
  savePreferences.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', 'Certains champs sont invalides.'))
  render(<NotificationPreferences />)

  await userEvent.click(await screen.findByRole('checkbox', { name: /nouveau résultat/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Enregistrer mes préférences' }))

  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enregistrer mes préférences' })).toBeEnabled()
})

test('preferences that cannot be read are announced instead of an empty form', async () => {
  fetchPreferences.mockRejectedValue(new ApiError(503, 'SERVICE_UNAVAILABLE', 'Indisponible.'))
  render(<NotificationPreferences />)

  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).toBeNull()
})
