// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceQuickHelp } from './WorkspaceQuickHelp'

afterEach(cleanup)

describe('WorkspaceQuickHelp', () => {
  it('stays concise and links to the full guide and tour', () => {
    const onOpenHelp = vi.fn()
    const onReplayTour = vi.fn()
    render(<WorkspaceQuickHelp onClose={vi.fn()} onOpenHelp={onOpenHelp} onReplayTour={onReplayTour} />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Open full Help' }))
    fireEvent.click(screen.getByRole('button', { name: 'Replay workspace tour' }))
    expect(onOpenHelp).toHaveBeenCalledOnce()
    expect(onReplayTour).toHaveBeenCalledOnce()
  })

  it('closes from the labelled close control', () => {
    const onClose = vi.fn()
    render(<WorkspaceQuickHelp onClose={onClose} onOpenHelp={vi.fn()} onReplayTour={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close quick help' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
