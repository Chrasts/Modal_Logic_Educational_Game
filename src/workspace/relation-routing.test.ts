import { describe, expect, it } from 'vitest'
import { assignRelationRouteLanes, calculateFloatingEdgeGeometry, RECIPROCAL_ARROWHEAD_SIZE, SINGLE_ARROWHEAD_SIZE } from './relation-routing'

describe('relation routing', () => {
  it('makes reciprocal arrowheads twenty percent larger than single arrowheads', () => {
    expect(RECIPROCAL_ARROWHEAD_SIZE / SINGLE_ARROWHEAD_SIZE).toBeCloseTo(1.2)
  })

  it('places endpoints on the facing circular perimeters', () => {
    const geometry = calculateFloatingEdgeGeometry(
      { x: 0, y: 0, width: 96, height: 96 },
      { x: 240, y: 0, width: 96, height: 96 },
    )
    expect(geometry.sourceX).toBeCloseTo(98)
    expect(geometry.targetX).toBeCloseTo(238)
    expect(geometry.sourceY).toBeCloseTo(48)
    expect(geometry.targetY).toBeCloseTo(48)
  })

  it('keeps a collapsed reciprocal relation central and separates nearby one-way lanes deterministically', () => {
    const relations = [
      { id: 'pair:a:b', source: 'a', target: 'b', kind: 'reciprocal' as const },
      { id: 'edge:c:b', source: 'c', target: 'b', kind: 'single' as const },
      { id: 'edge:d:b', source: 'd', target: 'b', kind: 'single' as const },
    ]
    const nodes = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 200, y: 0 } },
      { id: 'c', position: { x: 0, y: 8 } },
      { id: 'd', position: { x: 0, y: -8 } },
    ]
    const first = assignRelationRouteLanes(relations, nodes)
    const second = assignRelationRouteLanes(relations, nodes)
    expect([...first]).toEqual([...second])
    expect(first.get('pair:a:b')?.targetOffset).toBe(0)
    expect(first.get('edge:c:b')?.targetOffset).not.toBe(first.get('edge:d:b')?.targetOffset)
  })

  it('sends expanded reciprocal directions into distinct lanes', () => {
    const lanes = assignRelationRouteLanes([
      { id: 'forward', source: 'a', target: 'b', kind: 'expanded' },
      { id: 'reverse', source: 'b', target: 'a', kind: 'expanded' },
    ], [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 200, y: 0 } },
    ])
    expect(lanes.get('forward')?.sourceOffset).not.toBe(lanes.get('reverse')?.targetOffset)
    expect(lanes.get('forward')?.curveOffset).toBe(34)
    expect(lanes.get('reverse')?.curveOffset).toBe(34)
  })
})
