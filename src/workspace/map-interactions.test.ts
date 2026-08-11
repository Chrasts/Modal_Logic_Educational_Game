import { describe, expect, it } from 'vitest'
import { applyMapWheelGesture, classifyMapWheelGesture, MAP_MAX_ZOOM, MAP_MIN_ZOOM, modelMapInteractionProps, PINCH_ZOOM_MULTIPLIER, resolveMapWheelHandling } from './map-interactions'

describe('model map gesture contract', () => {
  it('leaves pointer drag-pan to React Flow and disables every competing wheel path', () => {
    expect(modelMapInteractionProps).toEqual({
      panOnScroll: false,
      zoomOnScroll: false,
      zoomOnDoubleClick: false,
      zoomOnPinch: false,
      panOnDrag: true,
    })
  })

  it('owns trackpad pan and applies both axes without a session latch', () => {
    const start = { x: 20, y: 30, zoom: 1 }
    const vertical = resolveMapWheelHandling({ ctrlKey: false, deltaMode: 0, deltaX: 0, deltaY: 8.5 }, start, { x: 10, y: 10 })
    expect(vertical).toEqual({ gesture: 'trackpad-pan', viewport: { x: 20, y: 21.5, zoom: 1 } })
    expect(resolveMapWheelHandling({ ctrlKey: false, deltaMode: 0, deltaX: 6, deltaY: 4 }, vertical.viewport, { x: 10, y: 10 })).toEqual({ gesture: 'trackpad-pan', viewport: { x: 14, y: 17.5, zoom: 1 } })
    expect(resolveMapWheelHandling({ ctrlKey: false, deltaMode: 0, deltaX: 7, deltaY: 0 }, start, { x: 10, y: 10 }).viewport).toEqual({ x: 13, y: 30, zoom: 1 })
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
    expect(applyMapWheelGesture(
      { ctrlKey: true, deltaMode: 0, deltaX: 0, deltaY: 1000 },
      { x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 },
    ).viewport.zoom).toBe(MAP_MIN_ZOOM)
  })

  it('is deterministic for the same wheel input', () => {
    const input = { ctrlKey: false, deltaMode: 0, deltaX: 3.25, deltaY: -2.5 }
    const viewport = { x: 12, y: -4, zoom: .8 }
    const pointer = { x: 90, y: 70 }
    expect(resolveMapWheelHandling(input, viewport, pointer)).toEqual(resolveMapWheelHandling(input, viewport, pointer))
  })
})
