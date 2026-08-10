import { describe, expect, it } from 'vitest'
import { createTidyModelLayout, type LayoutEdge, type LayoutWorld } from './model-layout'
import { worldPositionsOverlap } from './world-placement'

const makeWorlds = (count: number): LayoutWorld[] => Array.from({ length: count }, (_, key) => ({
  key, id: `w${key}`, position: { x: key * 3, y: key * 3 },
}))

const bounds = (layout: ReadonlyMap<number, { x: number; y: number }>, keys = [...layout.keys()]) => {
  const positions = keys.map((key) => layout.get(key)!)
  return {
    left: Math.min(...positions.map(({ x }) => x)), right: Math.max(...positions.map(({ x }) => x)),
    top: Math.min(...positions.map(({ y }) => y)), bottom: Math.max(...positions.map(({ y }) => y)),
  }
}

const expectNoOverlaps = (layout: ReadonlyMap<number, { x: number; y: number }>) => {
  const positions = [...layout.values()]
  for (let left = 0; left < positions.length; left += 1) {
    for (let right = left + 1; right < positions.length; right += 1) {
      expect(worldPositionsOverlap(positions[left], positions[right])).toBe(false)
    }
  }
}

describe('tidy model layout', () => {
  it('is deterministic, prioritises the evaluation component, and avoids overlaps', () => {
    const worlds = makeWorlds(6)
    const edges = [{ from: 'w2', to: 'w3' }, { from: 'w0', to: 'w1' }]
    const first = createTidyModelLayout(worlds, edges, 'w2')
    expect([...first]).toEqual([...createTidyModelLayout(worlds, edges, 'w2')])
    expect(bounds(first, [2, 3]).left).toBe(80)
    expectNoOverlaps(first)
  })

  it('keeps a seven-world chain compact in both axes instead of one long row', () => {
    const worlds = makeWorlds(7)
    const edges = worlds.slice(1).map((world, index) => ({ from: `w${index}`, to: world.id }))
    const layout = createTidyModelLayout(worlds, edges, 'w0')
    const box = bounds(layout)
    expect(box.right - box.left).toBeLessThan(850)
    expect(box.bottom - box.top).toBeGreaterThan(100)
    expectNoOverlaps(layout)
  })

  it.each([
    ['star', makeWorlds(7).slice(1).map((world) => ({ from: 'w0', to: world.id }))],
    ['cycle', makeWorlds(7).map((world, index) => ({ from: world.id, to: `w${(index + 1) % 7}` }))],
  ] satisfies Array<[string, LayoutEdge[]]>)('keeps the %s topology compact', (_name, edges) => {
    const layout = createTidyModelLayout(makeWorlds(7), edges, 'w0')
    const box = bounds(layout)
    expect((box.right - box.left) * (box.bottom - box.top)).toBeLessThan(500_000)
    expectNoOverlaps(layout)
  })

  it('packs disconnected components separately and groups isolates into a compact block', () => {
    const worlds = makeWorlds(9)
    const layout = createTidyModelLayout(worlds, [
      { from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' },
      { from: 'w3', to: 'w4' }, { from: 'w4', to: 'w5' },
    ], 'w3')
    const evaluationBox = bounds(layout, [3, 4, 5])
    const otherBox = bounds(layout, [0, 1, 2])
    expect(evaluationBox.right < otherBox.left || evaluationBox.bottom < otherBox.top).toBe(true)
    const isolateBox = bounds(layout, [6, 7, 8])
    expect(isolateBox.right - isolateBox.left).toBeLessThanOrEqual(280)
    expect(isolateBox.bottom - isolateBox.top).toBeLessThanOrEqual(280)
    expectNoOverlaps(layout)
  })

  it('ignores self-loops when finding components', () => {
    const worlds = makeWorlds(3)
    const withLoop = createTidyModelLayout(worlds, [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w2' }], 'w1')
    const withoutLoop = createTidyModelLayout(worlds, [{ from: 'w1', to: 'w2' }], 'w1')
    expect([...withLoop]).toEqual([...withoutLoop])
  })
})
