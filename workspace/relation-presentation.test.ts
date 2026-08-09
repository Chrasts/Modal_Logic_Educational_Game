import { describe, expect, it } from 'vitest'
import { buildRelationPresentations, describeRelationPresentation } from './relation-presentation'

describe('relation presentation', () => {
  it('collapses reverse explicit directions without changing their metadata', () => {
    const presentations = buildRelationPresentations(
      [{ from: 'w1', to: 'w0' }, { from: 'w0', to: 'w1' }],
      new Map([['w0\u0000w1', 4], ['w1\u0000w0', 7]]),
    )
    expect(presentations).toHaveLength(1)
    expect(presentations[0]).toMatchObject({ kind: 'bidirectional', source: 'w0', target: 'w1', forward: { explicitKey: 4, derived: false }, reverse: { explicitKey: 7, derived: false } })
  })

  it('keeps derived status on the individual direction', () => {
    const [presentation] = buildRelationPresentations(
      [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }],
      new Map([['w0\u0000w1', 2]]),
    )
    expect(presentation.forward.derived).toBe(false)
    expect(presentation.reverse?.derived).toBe(true)
    expect(describeRelationPresentation(presentation)).toContain('derived')
  })

  it('leaves one-way edges and self-loops as singles', () => {
    const presentations = buildRelationPresentations(
      [{ from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }],
      new Map([['w0\u0000w0', 0], ['w0\u0000w1', 1]]),
    )
    expect(presentations.map(({ kind }) => kind)).toEqual(['single', 'single'])
  })

  it('naturally becomes one-way when a hidden derived direction is absent', () => {
    const [presentation] = buildRelationPresentations([{ from: 'w0', to: 'w1' }], new Map([['w0\u0000w1', 1]]))
    expect(presentation.kind).toBe('single')
  })
})
