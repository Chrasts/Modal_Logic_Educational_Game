// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LearnRecoveryActions } from './LearnRecoveryActions'

afterEach(cleanup)

describe('LearnRecoveryActions', () => {
  it('offers non-punitive concept, Hint 3, and explicitly related-lesson actions', async () => {
    const onReview = vi.fn(), onHint = vi.fn(), onRelated = vi.fn()
    const user = userEvent.setup()
    render(<LearnRecoveryActions relatedTitle="Accessible witnesses" onReview={onReview} onHint={onHint} onRelated={onRelated} />)
    await user.click(screen.getByRole('button', { name: 'Review concept' }))
    await user.click(screen.getByRole('button', { name: 'Show Hint 3' }))
    await user.click(screen.getByRole('button', { name: /Try a related lesson/ }))
    expect([onReview, onHint, onRelated].every((callback) => callback.mock.calls.length === 1)).toBe(true)
    expect(screen.getByText(/do not reduce progress or add a penalty/)).toBeVisible()
  })
})
