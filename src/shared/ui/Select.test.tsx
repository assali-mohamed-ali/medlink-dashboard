import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expect, test } from 'vitest'
import Select from './Select'

const CLINICS = (
  <>
    <option value="">Choisissez une clinique</option>
    <option value="tunis">Tunis</option>
    <option value="sousse">Sousse</option>
  </>
)

test('a native select named by its label; choosing an option changes its value', async () => {
  render(<Select label="Clinique">{CLINICS}</Select>)
  const select = screen.getByRole('combobox', { name: 'Clinique' })
  await userEvent.selectOptions(select, 'Sousse')
  expect(select).toHaveValue('sousse')
})

test('a hint describes it; an error is announced, linked and marks it invalid', () => {
  render(
    <Select label="Clinique" hint="Celle où vous êtes suivi." error="Choisissez une clinique.">
      {CLINICS}
    </Select>,
  )
  const select = screen.getByRole('combobox', { name: 'Clinique' })
  expect(select).toHaveAttribute('aria-invalid', 'true')
  expect(select).toHaveAccessibleDescription('Celle où vous êtes suivi. Choisissez une clinique.')
  expect(screen.getByRole('alert')).toHaveTextContent('Choisissez une clinique.')
})

test('forwards the ref and native props (what react-hook-form needs)', () => {
  const ref = createRef<HTMLSelectElement>()
  render(
    <Select label="Clinique" ref={ref} name="clinic" required>
      {CLINICS}
    </Select>,
  )
  expect(ref.current).toBe(screen.getByRole('combobox', { name: 'Clinique' }))
  expect(ref.current).toHaveAttribute('name', 'clinic')
  expect(ref.current).toBeRequired()
})
