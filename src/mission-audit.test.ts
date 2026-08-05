import { describe, expect, it } from 'vitest'
import type { GameLevel } from './campaign'
import { auditMission } from './mission-audit'

const level: GameLevel = {
  id: 'audit', chapter: 'Custom', title: 'Audit', concept: 'Possibility', learningObjective: 'Construct a witness for possibility.',
  instruction: 'Make diamond p true at w0.', formula: 'diamond p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
  worlds: [{ id: 'w0', atoms: '', position: { x: 0, y: 0 } }, { id: 'w1', atoms: 'p', position: { x: 100, y: 0 } }],
  edges: [], editable: ['edges'], prediction: { kind: 'truth', prompt: 'Is the formula true before your edit?' },
}

describe('mission authoring audit', () => {
  it('requires a reference solution and rejects an already solved start', () => {
    expect(auditMission(level).some(({ severity, check }) => severity === 'error' && check === 'Reference solution')).toBe(true)
    const solved = { ...level, edges: [{ from: 'w0', to: 'w1' }] }
    expect(auditMission(solved).some(({ severity, check }) => severity === 'error' && check === 'Initial state')).toBe(true)
  })

  it('accepts a passing reference whose required edit is unlocked', () => {
    const solution = { worlds: level.worlds, edges: [{ from: 'w0', to: 'w1' }], evaluationWorld: 'w0' }
    const findings = auditMission(level, solution)
    expect(findings.find(({ check }) => check === 'Reference solution')?.severity).toBe('pass')
    expect(findings.find(({ check }) => check === 'Editable controls')?.severity).toBe('pass')
  })
})
