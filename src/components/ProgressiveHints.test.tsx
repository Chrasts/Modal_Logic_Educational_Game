// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProgressiveHints } from './ProgressiveHints'

describe('ProgressiveHints', () => {
  it('reveals only the next available hint', async () => {
    const onReveal = vi.fn()
    const { rerender } = render(<ProgressiveHints hints={['one', 'two', 'three']} revealed={0} onReveal={onReveal} />)
    expect(screen.queryByText('one')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reveal hint 1' }))
    expect(onReveal).toHaveBeenCalledWith(1)
    rerender(<ProgressiveHints hints={['one', 'two', 'three']} revealed={1} onReveal={onReveal} />)
    expect(screen.getByText(/one/)).toBeInTheDocument()
    expect(screen.queryByText(/two/)).not.toBeInTheDocument()
  })
})
