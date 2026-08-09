import { PanOnScrollMode } from '@xyflow/react'

/** Shared, tested React Flow contract for mouse-wheel and trackpad gestures. */
export const modelMapInteractionProps = Object.freeze({
  panOnScroll: true,
  panOnScrollMode: PanOnScrollMode.Free,
  zoomOnScroll: false,
  zoomOnPinch: true,
})
