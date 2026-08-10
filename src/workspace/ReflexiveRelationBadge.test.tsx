// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReflexiveRelationBadge } from './ReflexiveRelationBadge'

describe('reflexive relation badge', () => {
  it('selects an editable explicit self-loop without propagating to the world', async () => {
    const onSelect = vi.fn()
    const onWorldClick = vi.fn()
    render(<div onClick={onWorldClick}><ReflexiveRelationBadge
      presentation={{ worldId: 'w0', explicitKey: 7, derived: false }}
      selected={false}
      checked={false}
      editable
      onSelect={onSelect}
    /></div>)
    const badge = screen.getByRole('button', { name: 'Reflexive accessibility at w0, explicit relation' })
    expect(badge).toHaveClass('explicit')
    expect(badge).not.toHaveClass('derived')
    await userEvent.setup().click(badge)
    expect(onSelect).toHaveBeenCalledWith(7)
    expect(onWorldClick).not.toHaveBeenCalled()
  })

  it('communicates derived provenance through text and a dashed-style class without selecting an edge', () => {
    const onSelect = vi.fn()
    render(<ReflexiveRelationBadge
      presentation={{ worldId: 'w1', derived: true }}
      selected={false}
      checked
      editable
      onSelect={onSelect}
    />)
    const badge = screen.getByRole('button', { name: 'Reflexive accessibility at w1, derived by enforced frame rules' })
    expect(badge).toHaveClass('derived', 'trace-checked')
    expect(badge).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(badge)
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('keeps a locked explicit badge focusable but non-selecting', async () => {
    const onSelect = vi.fn()
    render(<ReflexiveRelationBadge
      presentation={{ worldId: 'w2', explicitKey: 2, derived: false }}
      selected={false}
      checked={false}
      editable={false}
      onSelect={onSelect}
    />)
    const badge = screen.getByRole('button', { name: 'Reflexive accessibility at w2, explicit relation' })
    badge.focus()
    expect(badge).toHaveFocus()
    await userEvent.setup().keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
