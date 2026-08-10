import { describe, expect, it } from 'vitest'
import { buildReflexiveRelationPresentations, buildRelationPresentations, describeRelationPresentation } from './relation-presentation'

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

  it('leaves one-way edges as singles and excludes self-loops from FlowEdge presentation', () => {
    const presentations = buildRelationPresentations(
      [{ from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }],
      new Map([['w0\u0000w0', 0], ['w0\u0000w1', 1]]),
    )
    expect(presentations).toHaveLength(1)
    expect(presentations[0]).toMatchObject({ kind: 'single', source: 'w0', target: 'w1' })
  })

  it('naturally becomes one-way when a hidden derived direction is absent', () => {
    const [presentation] = buildRelationPresentations([{ from: 'w0', to: 'w1' }], new Map([['w0\u0000w1', 1]]))
    expect(presentation.kind).toBe('single')
  })

  it('collapses back to one explicit direction after its reverse is deleted', () => {
    const before = buildRelationPresentations(
      [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }],
      new Map([['w0\u0000w1', 1], ['w1\u0000w0', 2]]),
    )
    const after = buildRelationPresentations(
      [{ from: 'w0', to: 'w1' }],
      new Map([['w0\u0000w1', 1]]),
    )
    expect(before[0].kind).toBe('bidirectional')
    expect(after[0]).toMatchObject({ kind: 'single', forward: { explicitKey: 1, derived: false } })
  })

  it('builds explicit and derived self-loop badge metadata with explicit priority', () => {
    const explicit = buildReflexiveRelationPresentations(
      [{ from: 'w0', to: 'w0' }],
      new Map([['w0\u0000w0', 9]]),
    )
    const derived = buildReflexiveRelationPresentations(
      [{ from: 'w1', to: 'w1' }],
      new Map(),
    )
    expect(explicit.get('w0')).toEqual({ worldId: 'w0', explicitKey: 9, derived: false })
    expect(derived.get('w1')).toEqual({ worldId: 'w1', explicitKey: undefined, derived: true })
    expect(buildReflexiveRelationPresentations([], new Map()).size).toBe(0)
  })
})
