import { PanOnScrollMode } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { applyMapWheelGesture, classifyMapWheelGesture, MAP_MAX_ZOOM, modelMapInteractionProps, PINCH_ZOOM_MULTIPLIER, resolveMapWheelHandling } from './map-interactions'

describe('model map gesture contract', () => {
  it('keeps native drag-pan and touch pinch while custom handling wheel events', () => {
    expect(modelMapInteractionProps).toEqual({
      panOnScroll: true,
      panOnScrollMode: PanOnScrollMode.Free,
      zoomOnScroll: false,
      zoomOnDoubleClick: false,
      zoomOnPinch: true,
      panOnDrag: true,
    })
  })

  it('leaves trackpad pan to React Flow without a custom viewport mutation', () => {
    expect(resolveMapWheelHandling({ ctrlKey: false, deltaMode: 0, deltaX: 8, deltaY: 0 }, { x: 1, y: 2, zoom: 1 }, { x: 10, y: 10 })).toEqual({ gesture: 'trackpad-pan', useNativePan: true })
  })

  it('classifies coarse wheel, fine 2D pan, and browser pinch gestures', () => {
    expect(classifyMapWheelGesture({ ctrlKey: false, deltaMode: 0, deltaX: 0, deltaY: 100 })).toBe('mouse-wheel-zoom')
    expect(classifyMapWheelGesture({ ctrlKey: false, deltaMode: 0, deltaX: 12, deltaY: 7 })).toBe('trackpad-pan')
    expect(classifyMapWheelGesture({ ctrlKey: true, deltaMode: 0, deltaX: 0, deltaY: -12 })).toBe('pinch-zoom')
  })

  it('applies both trackpad axes and anchors zoom under the pointer', () => {
    expect(applyMapWheelGesture(
      { ctrlKey: false, deltaMode: 0, deltaX: 9, deltaY: 7 },
      { x: 20, y: 30, zoom: 1 }, { x: 100, y: 80 },
    )).toEqual({ gesture: 'trackpad-pan', viewport: { x: 11, y: 23, zoom: 1 } })
    const zoomed = applyMapWheelGesture(
      { ctrlKey: false, deltaMode: 0, deltaX: 0, deltaY: -100 },
      { x: 0, y: 0, zoom: 1 }, { x: 200, y: 100 },
    )
    expect((200 - zoomed.viewport.x) / zoomed.viewport.zoom).toBeCloseTo(200)
    expect((100 - zoomed.viewport.y) / zoomed.viewport.zoom).toBeCloseTo(100)
  })

  it('uses a faster pinch multiplier and clamps zoom', () => {
    expect(PINCH_ZOOM_MULTIPLIER).toBeGreaterThanOrEqual(1.5)
    const zoomed = applyMapWheelGesture(
      { ctrlKey: true, deltaMode: 0, deltaX: 0, deltaY: -1000 },
      { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 },
    )
    expect(zoomed.viewport.zoom).toBe(MAP_MAX_ZOOM)
  })
})
