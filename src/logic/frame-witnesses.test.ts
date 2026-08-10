import { describe, expect, it } from 'vitest'
import { checkFrameProperty } from './frame'

describe('structured frame-property witnesses', () => {
  it.each([
    ['reflexive', [], 'missing-reflexive'],
    ['serial', [], 'missing-successor'],
    ['irreflexive', [{ from: 'a', to: 'a' }], 'irreflexive-loop'],
    ['symmetric', [{ from: 'a', to: 'b' }], 'missing-symmetric'],
    ['transitive', [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }], 'missing-transitive'],
    ['euclidean', [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }], 'missing-euclidean'],
    ['acyclic', [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }], 'cycle'],
  ] as const)('returns a %s witness', (property, edges, kind) => {
    expect(checkFrameProperty(['a', 'b', 'c'], edges, property).witnesses.some((witness) => witness.kind === kind)).toBe(true)
  })
})
