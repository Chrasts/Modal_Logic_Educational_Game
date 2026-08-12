// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModalLogicWelcome } from './ModalLogicWelcome'

afterEach(cleanup)

describe('ModalLogicWelcome', () => {
  it('introduces both modal operators in a concise introduction', () => {
    const { container } = render(<ModalLogicWelcome onBegin={vi.fn()} onSkip={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Necessity — □φ' })).toBeVisible()
    expect(screen.getByText(/every world accessible from it/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Possibility — ◇φ' })).toBeVisible()
    expect(screen.getByText(/at least one world accessible from it/)).toBeVisible()
    expect(screen.getByText('Learn Modal Logic · Introduction')).toBeVisible()
    expect(screen.getByText(/useful foundation for reasoning about systems, information, and time/)).toBeVisible()
    const symbols = container.querySelectorAll('svg.modal-operator-symbol[aria-hidden="true"]')
    expect(symbols).toHaveLength(2)
    expect(symbols[0].getAttribute('class')).toBe(symbols[1].getAttribute('class'))
  })

  it('switches the diagram explanation between possibility and necessity', async () => {
    const user = userEvent.setup()
    render(<ModalLogicWelcome onBegin={vi.fn()} onSkip={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/at least one accessible world, w1, satisfies p/)).toBeVisible()
    expect(screen.queryByText(/¬p/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show □ necessity' }))
    expect(screen.getByText(/every accessible world satisfies p/)).toBeVisible()
    expect(screen.getByText('w2 · p')).toBeVisible()
    expect(screen.queryByText(/counterexample/)).not.toBeInTheDocument()
  })

  it('uses exactly four task steps and omits the obsolete completion warning', () => {
    render(<ModalLogicWelcome onBegin={vi.fn()} onSkip={vi.fn()} onBack={vi.fn()} />)
    const section = screen.getByRole('heading', { name: 'What happens next' }).closest('article')!
    expect(within(section).getAllByRole('listitem')).toHaveLength(4)
    expect(within(section).getByText(/first learn the model-building controls, then use the same workspace to learn modal logic/)).toBeVisible()
    expect(screen.queryByText('Tasks do not complete automatically after an edit.')).not.toBeInTheDocument()
  })
})
