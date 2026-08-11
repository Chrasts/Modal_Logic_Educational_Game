import { describe, expect, it } from 'vitest'
import { applyCollisionClassNames, commitWorldPosition, findFreeWorldPosition, findOverlappingWorldKeys, resolveWorldVisualCenter, shouldCreateWorldFromPaneClick, WORLD_NODE_SIZE, worldPositionsOverlap } from './world-placement'

describe('world placement', () => {
  it('derives the visual centre from shared world geometry', () => {
    expect(resolveWorldVisualCenter({ x: 20, y: 30 })).toEqual({ x: 20 + WORLD_NODE_SIZE / 2, y: 30 + WORLD_NODE_SIZE / 2 })
  })

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

  it('patches collision styling without resetting live node positions', () => {
    const nodes = [
      { id: '0', position: { x: 333, y: 222 }, className: 'evaluation-node' },
      { id: '1', position: { x: 80, y: 90 }, className: '' },
    ]
    const patched = applyCollisionClassNames(nodes, new Set([0, 1]))
    expect(patched.map(({ position }) => position)).toEqual(nodes.map(({ position }) => position))
    expect(patched[0].className).toContain('colliding-world-node')
    expect(applyCollisionClassNames(patched, new Set())[0].className).toBe('evaluation-node')
  })

  it('commits only the dragged world position', () => {
    const worlds = [{ key: 0, position: { x: 0, y: 0 } }, { key: 1, position: { x: 10, y: 20 } }]
    expect(commitWorldPosition(worlds, 1, { x: 90, y: 120 })).toEqual([
      worlds[0], { key: 1, position: { x: 90, y: 120 } },
    ])
  })

  it('allows only editable desktop pane double-click creation', () => {
    expect(shouldCreateWorldFromPaneClick({ detail: 2, canEditWorlds: true, pointerType: 'mouse' })).toBe(true)
    expect(shouldCreateWorldFromPaneClick({ detail: 2, canEditWorlds: false, pointerType: 'mouse' })).toBe(false)
    expect(shouldCreateWorldFromPaneClick({ detail: 1, canEditWorlds: true, pointerType: 'mouse' })).toBe(false)
    expect(shouldCreateWorldFromPaneClick({ detail: 2, canEditWorlds: true, pointerType: 'touch' })).toBe(false)
  })
})
