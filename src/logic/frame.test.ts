import { describe, expect, it } from 'vitest'
import { applyFrameProperties, type FrameProperties } from './frame'

const none: FrameProperties = { reflexive: false, symmetric: false, transitive: false }
const pairs = (edges: readonly { from: string; to: string }[]) => edges.map(({ from, to }) => `${from}${to}`).sort()

describe('frame-property closure', () => {
  it('leaves an unconstrained relation unchanged', () => {
    expect(pairs(applyFrameProperties(['a', 'b'], [{ from: 'a', to: 'b' }], none))).toEqual(['ab'])
  })

  it('adds a reflexive edge to every world', () => {
    expect(pairs(applyFrameProperties(['a', 'b'], [], { ...none, reflexive: true }))).toEqual(['aa', 'bb'])
  })

  it('adds reverse edges for symmetry', () => {
    expect(pairs(applyFrameProperties(['a', 'b'], [{ from: 'a', to: 'b' }], { ...none, symmetric: true }))).toEqual(['ab', 'ba'])
  })

  it('computes the full transitive closure', () => {
    const result = applyFrameProperties(
      ['a', 'b', 'c', 'd'],
      [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' }],
      { ...none, transitive: true },
    )
    expect(pairs(result)).toEqual(['ab', 'ac', 'ad', 'bc', 'bd', 'cd'])
  })

  it('repeats closure until combined properties are both satisfied', () => {
    const result = applyFrameProperties(
      ['a', 'b', 'c'],
      [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
      { reflexive: false, symmetric: true, transitive: true },
    )
    expect(pairs(result)).toEqual(['aa', 'ab', 'ac', 'ba', 'bb', 'bc', 'ca', 'cb', 'cc'])
  })
})

