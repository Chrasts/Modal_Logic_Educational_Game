import { describe, expect, it } from 'vitest'
import { findFrameRuleConflicts } from './frame-rule-conflicts'

describe('frame rule conflicts', () => {
  it.each([
    [{ reflexive: 'validate', irreflexive: 'enforce' }, 'reflexive-irreflexive'],
    [{ reflexive: 'enforce', acyclic: 'validate' }, 'reflexive-acyclic'],
    [{ serial: 'validate', acyclic: 'validate' }, 'serial-acyclic'],
    [{ serial: 'validate', transitive: 'enforce', irreflexive: 'validate' }, 'serial-transitive-irreflexive'],
  ] as const)('warns for %o', (rules, id) => expect(findFrameRuleConflicts(rules, 1).map((item) => item.id)).toContain(id))

  it('does not warn for an empty frame or nearby satisfiable requirements', () => {
    expect(findFrameRuleConflicts({ reflexive: 'validate', irreflexive: 'validate' }, 0)).toEqual([])
    expect(findFrameRuleConflicts({ serial: 'validate', transitive: 'validate' }, 2)).toEqual([])
  })
})
