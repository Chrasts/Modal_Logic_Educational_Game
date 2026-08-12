// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceResizeHandle } from './WorkspaceResizeHandle'

afterEach(() => {
  cleanup()
  document.body.classList.remove('workspace-resizing')
})

describe('WorkspaceResizeHandle', () => {
  it('exposes separator values and resizes from the keyboard', () => {
    const onResize = vi.fn()
    render(<WorkspaceResizeHandle side="left" value={242} onResize={onResize} />)
    const separator = screen.getByRole('separator', { name: 'Resize left workspace panel' })
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    expect(separator).toHaveAttribute('aria-valuenow', '242')
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    fireEvent.keyDown(separator, { key: 'ArrowLeft', shiftKey: true })
    expect(onResize).toHaveBeenNthCalledWith(1, 254)
    expect(onResize).toHaveBeenNthCalledWith(2, 202)
  })

  it('uses pointer movement and releases the global resize state', () => {
    const onResize = vi.fn()
    render(<WorkspaceResizeHandle side="right" value={242} onResize={onResize} />)
    const separator = screen.getByRole('separator')
    Object.defineProperty(separator, 'setPointerCapture', { value: vi.fn() })
    fireEvent.pointerDown(separator, { pointerId: 1, clientX: 400 })
    expect(document.body).toHaveClass('workspace-resizing')
    fireEvent.pointerMove(window, { clientX: 360 })
    expect(onResize).toHaveBeenCalledWith(282)
    fireEvent.pointerUp(window)
    expect(document.body).not.toHaveClass('workspace-resizing')
  })
})
