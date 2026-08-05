// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModalLogicWelcome } from './ModalLogicWelcome'

afterEach(cleanup)

describe('ModalLogicWelcome', () => {
  it('introduces both modal operators and the finite modelling scope', () => {
    render(<ModalLogicWelcome onBegin={vi.fn()} onSkip={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Necessity — □φ' })).toBeVisible()
    expect(screen.getByText(/every world accessible from it/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Possibility — ◇φ' })).toBeVisible()
    expect(screen.getByText(/at least one world accessible from it/)).toBeVisible()
    expect(screen.getByText(/long-established formal tool for modelling/)).toBeVisible()
    expect(screen.getByText(/finite Kripke semantics for basic modal logic/)).toBeVisible()
  })

  it('switches the diagram explanation between possibility and necessity', async () => {
    const user = userEvent.setup()
    render(<ModalLogicWelcome onBegin={vi.fn()} onSkip={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/w1 satisfies p: it is a witness/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Show □ necessity' }))
    expect(screen.getByText(/w2 does not satisfy p: it is a counterexample/)).toBeVisible()
  })

  it('uses exactly four task steps and omits the obsolete completion warning', () => {
    render(<ModalLogicWelcome onBegin={vi.fn()} onSkip={vi.fn()} onBack={vi.fn()} />)
    const section = screen.getByRole('heading', { name: 'How each task works' }).closest('article')!
    expect(within(section).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.queryByText('Tasks do not complete automatically after an edit.')).not.toBeInTheDocument()
  })
})
