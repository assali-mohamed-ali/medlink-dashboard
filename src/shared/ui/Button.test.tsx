import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import Button from './Button'

test('is a plain button by default, so it never submits a form by accident', () => {
  render(<Button>Annuler</Button>)
  expect(screen.getByRole('button', { name: 'Annuler' })).toHaveAttribute('type', 'button')
})

test('passes the native props through', async () => {
  const onClick = vi.fn()
  render(
    <Button type="submit" onClick={onClick} aria-describedby="hint">
      Se connecter
    </Button>,
  )
  const button = screen.getByRole('button', { name: 'Se connecter' })
  expect(button).toHaveAttribute('type', 'submit')
  expect(button).toHaveAttribute('aria-describedby', 'hint')
  await userEvent.click(button)
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('while loading: disabled, busy, still named, and clicks do nothing', async () => {
  const onClick = vi.fn()
  render(
    <Button loading onClick={onClick}>
      Se connecter
    </Button>,
  )
  const button = screen.getByRole('button', { name: /Se connecter/ })
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('aria-busy', 'true')
  await userEvent.click(button)
  expect(onClick).not.toHaveBeenCalled()
})
