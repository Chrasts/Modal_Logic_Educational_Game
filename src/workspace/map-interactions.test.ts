import { PanOnScrollMode } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { modelMapInteractionProps } from './map-interactions'

describe('model map gesture contract', () => {
  it('maps two-finger scrolling to free panning and reserves zoom for pinch', () => {
    expect(modelMapInteractionProps).toEqual({
      panOnScroll: true,
      panOnScrollMode: PanOnScrollMode.Free,
      zoomOnScroll: false,
      zoomOnPinch: true,
    })
  })
})
