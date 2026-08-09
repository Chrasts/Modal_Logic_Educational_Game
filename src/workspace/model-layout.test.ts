import { describe, expect, it } from 'vitest'
import { createTidyModelLayout } from './model-layout'
import { worldPositionsOverlap } from './world-placement'

const worlds = [
  { key: 0, id: 'w0', position: { x: 310, y: 400 } },
  { key: 1, id: 'w1', position: { x: 20, y: 20 } },
  { key: 2, id: 'w2', position: { x: 25, y: 25 } },
  { key: 3, id: 'w3', position: { x: 25, y: 25 } },
]
const edges = [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w2' }]

describe('tidy model layout', () => {
  it('is deterministic, anchors the evaluation component, and avoids overlaps', () => {
    const first = createTidyModelLayout(worlds, edges, 'w0')
    const second = createTidyModelLayout(worlds, edges, 'w0')
    expect([...first]).toEqual([...second])
    expect(first.get(0)?.x).toBe(80)
    const positions = [...first.values()]
    for (let left = 0; left < positions.length; left += 1) {
      for (let right = left + 1; right < positions.length; right += 1) {
        expect(worldPositionsOverlap(positions[left], positions[right])).toBe(false)
      }
    }
  })

  it('ignores self-loops for layer distance and separates disconnected worlds', () => {
    const layout = createTidyModelLayout(worlds, edges, 'w0')
    expect(layout.get(2)?.x).toBeGreaterThan(layout.get(1)?.x ?? 0)
    expect(layout.get(3)?.x).toBeGreaterThan(layout.get(2)?.x ?? 0)
  })
})
