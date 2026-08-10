// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorldIdInput } from './WorldIdInput'

afterEach(cleanup)

describe('WorldIdInput', () => {
  it('commits trimmed input on Enter and restores invalid input on blur', async () => {
    const user = userEvent.setup()
    const commit = vi.fn((value: string) => value === 'taken' ? 'Already used.' : null)
    render(<WorldIdInput value="w0" ariaLabel="World" onCommit={commit} />)
    const input = screen.getByRole('textbox', { name: 'World' })
    await user.clear(input); await user.type(input, ' alpha '); await user.keyboard('{Enter}')
    expect(commit).toHaveBeenCalledWith('alpha')
    await user.clear(input); await user.type(input, 'taken'); await user.tab()
    expect(input).toHaveValue('w0')
    expect(screen.getByRole('alert')).toHaveTextContent('Already used.')
  })

  it('restores the committed value on Escape without committing', async () => {
    const user = userEvent.setup()
    const commit = vi.fn(() => null)
    render(<WorldIdInput value="w0" ariaLabel="World" onCommit={commit} />)
    const input = screen.getByRole('textbox', { name: 'World' })
    await user.clear(input); await user.type(input, 'draft'); await user.keyboard('{Escape}')
    expect(input).toHaveValue('w0')
    expect(commit).not.toHaveBeenCalled()
  })
})
