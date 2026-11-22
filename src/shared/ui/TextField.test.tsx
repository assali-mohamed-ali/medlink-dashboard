import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expect, test } from 'vitest'
import TextField from './TextField'

test('the label names the input', () => {
  render(<TextField label="Adresse e-mail" type="email" />)
  expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('type', 'email')
})

test('an error is announced and linked to the input', () => {
  render(<TextField label="Prénom" error="Saisissez votre prénom." />)
  const input = screen.getByLabelText('Prénom')
  const error = screen.getByRole('alert')
  expect(error).toHaveTextContent('Saisissez votre prénom.')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input.getAttribute('aria-describedby')).toContain(error.id)
})

test('a hint describes the input, and there is no error state without an error', () => {
  render(<TextField label="Téléphone" hint="Chiffres, espaces et + au début." />)
  const input = screen.getByLabelText('Téléphone')
  expect(input).toHaveAttribute('aria-invalid', 'false')
  expect(input).toHaveAccessibleDescription('Chiffres, espaces et + au début.')
  expect(screen.queryByRole('alert')).toBeNull()
})

test('forwards the ref and native props (what react-hook-form needs)', async () => {
  const ref = createRef<HTMLInputElement>()
  render(<TextField label="Nom" name="lastName" ref={ref} autoComplete="family-name" />)
  await userEvent.type(screen.getByLabelText('Nom'), 'Ben Salah')
  expect(ref.current?.value).toBe('Ben Salah')
  expect(ref.current).toHaveAttribute('name', 'lastName')
  expect(ref.current).toHaveAttribute('autocomplete', 'family-name')
})

test('with maxLength, a count tells how many characters are used, and follows the typing', async () => {
  render(<TextField label="Motif du rendez-vous" maxLength={100} />)
  const input = screen.getByLabelText('Motif du rendez-vous')
  expect(input).toHaveAccessibleDescription('0 / 100 caractères')
  await userEvent.type(input, 'Douleur')
  expect(input).toHaveAccessibleDescription('7 / 100 caractères')
})

test('the count starts from a default value and still calls the given onChange', async () => {
  const seen: string[] = []
  render(
    <TextField
      label="Motif"
      maxLength={20}
      defaultValue="Bilan"
      hint="Facultatif."
      onChange={(event) => seen.push(event.target.value)}
    />,
  )
  const input = screen.getByLabelText('Motif')
  expect(input).toHaveAccessibleDescription('Facultatif. 5 / 20 caractères')
  await userEvent.type(input, 's')
  expect(input).toHaveAccessibleDescription('Facultatif. 6 / 20 caractères')
  expect(seen).toEqual(['Bilans'])
})
