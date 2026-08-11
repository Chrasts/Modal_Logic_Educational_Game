export const MAP_MIN_ZOOM = 0.35
export const MAP_MAX_ZOOM = 1.8
export const MOUSE_WHEEL_ZOOM_SENSITIVITY = 0.0028
export const PINCH_ZOOM_MULTIPLIER = 1.75

export type MapWheelGesture = 'mouse-wheel-zoom' | 'trackpad-pan' | 'pinch-zoom'

export interface MapWheelInput {
  readonly ctrlKey: boolean
  readonly deltaMode: number
  readonly deltaX: number
  readonly deltaY: number
}

export interface MapViewport {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export interface MapWheelHandling {
  readonly gesture: MapWheelGesture
  readonly viewport: MapViewport
}

/**
 * Browsers expose both a mouse wheel and two-finger scrolling as WheelEvent.
 * This intentionally conservative heuristic favours 2D/fine pixel deltas as
 * trackpad pan and coarse/discrete deltas as mouse-wheel zoom.
 */
export function classifyMapWheelGesture(event: MapWheelInput): MapWheelGesture {
  if (event.ctrlKey) return 'pinch-zoom'
  if (event.deltaMode !== 0) return 'mouse-wheel-zoom'
  const magnitude = Math.max(Math.abs(event.deltaX), Math.abs(event.deltaY))
  if (Math.abs(event.deltaX) > 0.5 || magnitude < 48 || !Number.isInteger(event.deltaY)) return 'trackpad-pan'
  return 'mouse-wheel-zoom'
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export function applyMapWheelGesture(
  event: MapWheelInput,
  viewport: MapViewport,
  pointer: { readonly x: number; readonly y: number },
): MapWheelHandling {
  const gesture = classifyMapWheelGesture(event)
  if (gesture === 'trackpad-pan') {
    return { gesture, viewport: { ...viewport, x: viewport.x - event.deltaX, y: viewport.y - event.deltaY } }
  }
  const multiplier = gesture === 'pinch-zoom' ? PINCH_ZOOM_MULTIPLIER : 1
  const nextZoom = clamp(
    viewport.zoom * Math.exp(-event.deltaY * MOUSE_WHEEL_ZOOM_SENSITIVITY * multiplier),
    MAP_MIN_ZOOM,
    MAP_MAX_ZOOM,
  )
  const flowX = (pointer.x - viewport.x) / viewport.zoom
  const flowY = (pointer.y - viewport.y) / viewport.zoom
  return {
    gesture,
    viewport: {
      x: pointer.x - flowX * nextZoom,
      y: pointer.y - flowY * nextZoom,
      zoom: nextZoom,
    },
  }
}

export function resolveMapWheelHandling(event: MapWheelInput, viewport: MapViewport, pointer: { readonly x: number; readonly y: number }): MapWheelHandling {
  return applyMapWheelGesture(event, viewport, pointer)
}

/** React Flow owns pointer drag-pan only. A non-passive DOM listener owns every wheel/pinch gesture. */
export const modelMapInteractionProps = Object.freeze({
  panOnScroll: false,
  zoomOnScroll: false,
  zoomOnDoubleClick: false,
  zoomOnPinch: false,
  panOnDrag: true,
})
