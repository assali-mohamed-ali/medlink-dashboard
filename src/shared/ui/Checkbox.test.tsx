import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expect, test } from 'vitest'
import Checkbox from './Checkbox'
import RadioGroup from './RadioGroup'

test('a checkbox toggles from its label, and its error is announced and linked', async () => {
  render(<Checkbox label="J’accepte les conditions d’utilisation" error="Cochez la case pour continuer." />)
  const box = screen.getByRole('checkbox', { name: 'J’accepte les conditions d’utilisation' })
  expect(box).toHaveAttribute('aria-invalid', 'true')
  expect(box).toHaveAccessibleDescription('Cochez la case pour continuer.')
  await userEvent.click(screen.getByText('J’accepte les conditions d’utilisation'))
  expect(box).toBeChecked()
})

test('a checkbox forwards the ref and native props', () => {
  const ref = createRef<HTMLInputElement>()
  render(<Checkbox label="Me rappeler" ref={ref} name="remember" defaultChecked />)
  expect(ref.current).toHaveAttribute('name', 'remember')
  expect(ref.current).toBeChecked()
})

test('a radio group is a group named by its legend; one choice at a time, reported by onChange', async () => {
  const chosen: string[] = []
  render(
    <RadioGroup
      legend="Type de consultation"
      name="kind"
      options={[
        { value: 'cabinet', label: 'Au cabinet' },
        { value: 'video', label: 'En vidéo' },
      ]}
      onChange={(value) => chosen.push(value)}
    />,
  )
  expect(screen.getByRole('group', { name: 'Type de consultation' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: 'En vidéo' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Au cabinet' }))
  expect(screen.getByRole('radio', { name: 'Au cabinet' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'En vidéo' })).not.toBeChecked()
  expect(chosen).toEqual(['video', 'cabinet'])
})

test('a radio group error is announced and describes the group', () => {
  render(
    <RadioGroup
      legend="Type de consultation"
      name="kind"
      options={[{ value: 'cabinet', label: 'Au cabinet' }]}
      error="Choisissez un type de consultation."
    />,
  )
  const group = screen.getByRole('group', { name: 'Type de consultation' })
  expect(group).toHaveAccessibleDescription('Choisissez un type de consultation.')
  expect(screen.getByRole('alert')).toHaveTextContent('Choisissez un type de consultation.')
})
