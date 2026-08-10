import { describe, expect, it } from 'vitest'
import { resolveModalEdgeEndpoints, selectModalEdgeRoute } from './ModalEdge'

describe('modal edge routing', () => {
  it('keeps self-loop endpoints instead of filtering them out', () => {
    expect(resolveModalEdgeEndpoints('0', '0')).toEqual({ source: '0', target: '0' })
  })

  it('selects a direct perimeter-to-perimeter route without a lane offset', () => {
    expect(selectModalEdgeRoute({ sourceX: 48, sourceY: 48, targetX: 240, targetY: 48 }).kind).toBe('direct')
  })

  it('uses the assigned deterministic lane offset for incident edges', () => {
    const route = selectModalEdgeRoute({ sourceX: 0, sourceY: 0, targetX: 10, targetY: 240, curveOffset: 16 })
    expect(route.kind).toBe('curved')
    expect(route.path).not.toBe(selectModalEdgeRoute({ sourceX: 0, sourceY: 0, targetX: 10, targetY: 240, curveOffset: -16 }).path)
  })

  it('separates reverse pairs on opposite sides', () => {
    const forward = selectModalEdgeRoute({ sourceX: 0, sourceY: 0, targetX: 200, targetY: 0, reversePair: true, routeSign: 1 })
    const reverse = selectModalEdgeRoute({ sourceX: 200, sourceY: 0, targetX: 0, targetY: 0, reversePair: true, routeSign: 1 })
    expect(forward.kind).toBe('reverse')
    expect(reverse.kind).toBe('reverse')
    expect(forward.path).not.toBe(reverse.path)
    expect(forward.path).toContain(',34')
    expect(reverse.path).toContain(',-34')
  })
})
