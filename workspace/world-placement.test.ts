import { describe, expect, it } from 'vitest'
import { findFreeWorldPosition, findOverlappingWorldKeys, shouldCreateWorldFromPaneClick, worldPositionsOverlap } from './world-placement'

describe('world placement', () => {
  it('uses the preferred position when it is free', () => {
    expect(findFreeWorldPosition([], { x: 120, y: 90 })).toEqual({ x: 120, y: 90 })
  })

  it('deterministically finds a nearby non-overlapping position', () => {
    const worlds = [{ position: { x: 100, y: 100 } }, { position: { x: 236, y: 100 } }]
    const first = findFreeWorldPosition(worlds, { x: 100, y: 100 })
    expect(first).toEqual(findFreeWorldPosition(worlds, { x: 100, y: 100 }))
    expect(worlds.every((world) => !worldPositionsOverlap(world.position, first))).toBe(true)
  })

  it('reports overlap without moving either world', () => {
    expect([...findOverlappingWorldKeys([
      { key: 1, position: { x: 0, y: 0 } },
      { key: 2, position: { x: 50, y: 40 } },
    ], 1, { x: 30, y: 20 })]).toEqual([1, 2])
  })

  it('allows only editable desktop pane double-click creation', () => {
    expect(shouldCreateWorldFromPaneClick({ detail: 2, canEditWorlds: true, pointerType: 'mouse' })).toBe(true)
    expect(shouldCreateWorldFromPaneClick({ detail: 2, canEditWorlds: false, pointerType: 'mouse' })).toBe(false)
    expect(shouldCreateWorldFromPaneClick({ detail: 1, canEditWorlds: true, pointerType: 'mouse' })).toBe(false)
    expect(shouldCreateWorldFromPaneClick({ detail: 2, canEditWorlds: true, pointerType: 'touch' })).toBe(false)
  })
})
