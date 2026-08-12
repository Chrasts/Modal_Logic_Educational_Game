import type { KeyboardEvent, PointerEvent } from 'react'
import { WORKSPACE_SIDE_MAX, WORKSPACE_SIDE_MIN } from './workspace-layout'

export function WorkspaceResizeHandle({ side, value, onResize }: {
  readonly side: 'left' | 'right'
  readonly value: number
  readonly onResize: (value: number) => void
}) {
  const label = `Resize ${side} workspace panel`
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = value
    document.body.classList.add('workspace-resizing')
    const move = (moveEvent: globalThis.PointerEvent) => onResize(startWidth + (side === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX))
    const finish = () => {
      document.body.classList.remove('workspace-resizing')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const physicalDelta = (event.shiftKey ? 40 : 12) * (event.key === 'ArrowRight' ? 1 : -1)
    onResize(value + (side === 'left' ? physicalDelta : -physicalDelta))
  }
  return <div
    className={`workspace-resize-handle ${side}`}
    role="separator"
    aria-label={label}
    aria-orientation="vertical"
    aria-valuemin={WORKSPACE_SIDE_MIN}
    aria-valuemax={WORKSPACE_SIDE_MAX}
    aria-valuenow={Math.round(value)}
    tabIndex={0}
    onPointerDown={onPointerDown}
    onKeyDown={onKeyDown}
  />
}
