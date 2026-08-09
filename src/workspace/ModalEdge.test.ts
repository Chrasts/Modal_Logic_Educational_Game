import { describe, expect, it } from 'vitest'
import { resolveModalEdgeEndpoints, selectModalEdgeRoute } from './ModalEdge'

describe('modal edge routing', () => {
  it('keeps self-loop endpoints instead of filtering them out', () => {
    expect(resolveModalEdgeEndpoints('0', '0')).toEqual({ source: '0', target: '0' })
  })

  it('selects a standard curve for horizontal edges', () => {
    expect(selectModalEdgeRoute({ sourceX: 0, sourceY: 0, targetX: 240, targetY: 20 }).kind).toBe('horizontal')
  })

  it('offsets near-vertical edges', () => {
    const route = selectModalEdgeRoute({ sourceX: 0, sourceY: 0, targetX: 10, targetY: 240 })
    expect(route.kind).toBe('vertical')
    expect(route.path).toContain('58')
  })

  it('separates reverse pairs on opposite sides', () => {
    const forward = selectModalEdgeRoute({ sourceX: 0, sourceY: 0, targetX: 200, targetY: 0, reversePair: true, routeSign: 1 })
    const reverse = selectModalEdgeRoute({ sourceX: 200, sourceY: 0, targetX: 0, targetY: 0, reversePair: true, routeSign: 1 })
    expect(forward.kind).toBe('reverse')
    expect(reverse.kind).toBe('reverse')
    expect(forward.path).not.toBe(reverse.path)
    expect(forward.path).toContain(',42')
    expect(reverse.path).toContain(',-42')
  })

  it('draws a large external self-loop', () => {
    const route = selectModalEdgeRoute({ sourceX: 100, sourceY: 100, targetX: 100, targetY: 100, selfLoop: true })
    expect(route.kind).toBe('self-loop')
    expect(route.path).toContain('C 174')
  })
})
