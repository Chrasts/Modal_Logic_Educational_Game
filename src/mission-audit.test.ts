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
    expect(findings.find(({ check }) => check === 'Reference distance')?.detail).toContain('One semantic edit')
  })

  it('reports all blocking constraint conflicts and impossible references', () => {
    const conflicted: GameLevel = { ...level, constraints: {
      minimumWorlds: 3, maximumWorlds: 2, minimumEdges: 2, maximumEdges: 1, maximumChanges: 0,
      requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'missing' }], forbiddenEdges: [{ from: 'w0', to: 'w1' }],
      requiredAtoms: { w0: ['p'], missing: ['q'] }, forbiddenAtoms: { w0: ['p'] },
      requiredProperties: ['reflexive'], forbiddenProperties: ['reflexive'],
    } }
    const solution = { worlds: level.worlds, edges: [{ from: 'w0', to: 'w1' }], evaluationWorld: 'w0' }
    const details = auditMission(conflicted, solution).filter(({ check }) => check === 'Constraint consistency').map(({ detail }) => detail).join(' | ')
    expect(details).toContain('minimumWorlds exceeds maximumWorlds')
    expect(details).toContain('minimumEdges exceeds maximumEdges')
    expect(details).toContain('both required and forbidden')
    expect(details).toContain('unknown world')
    expect(auditMission(conflicted, solution).some(({ check, severity }) => check === 'Reference solution' && severity === 'error')).toBe(true)
  })

  it('validates expected semantic answers', () => {
    const wrongCounterexample: GameLevel = { ...level, formula: 'p', scope: 'model', prediction: { kind: 'counterexample-world', prompt: 'Which world fails?', expectedChoice: 'w1' } }
    expect(auditMission(wrongCounterexample).find(({ check }) => check === 'Expected answer')?.severity).toBe('error')
    const rightCounterexample: GameLevel = { ...wrongCounterexample, prediction: { ...wrongCounterexample.prediction!, expectedChoice: 'w0' } }
    expect(auditMission(rightCounterexample).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')
  })

  it('validates witness, countervaluation, model, property, and scope predictions', () => {
    const witness: GameLevel = { ...level, edges: [{ from: 'w0', to: 'w1' }], prediction: { kind: 'world-choice', prompt: 'Which world witnesses diamond p?', expectedChoice: 'w1', worldChoices: ['w0', 'w1'] } }
    expect(auditMission(witness).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')

    const countervaluation: GameLevel = { ...level, formula: 'p', prediction: { kind: 'countervaluation', prompt: 'Which valuation refutes p at w0?', expectedChoice: 'A', countervaluationChoices: [{ id: 'A', valuation: { w0: [], w1: ['p'] } }, { id: 'B', valuation: { w0: ['p'], w1: [] } }] } }
    expect(auditMission(countervaluation).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')

    const modelChoice: GameLevel = { ...level, prediction: { kind: 'model-choice', prompt: 'Which model satisfies diamond p?', expectedChoice: 'A', modelChoices: [
      { id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [{ from: 'w0', to: 'w1' }] },
      { id: 'B', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [] },
    ] } }
    expect(auditMission(modelChoice).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')

    const missingSymmetry: GameLevel = { ...level, formula: 'p -> p', scope: 'frame', edges: [{ from: 'w0', to: 'w1' }], prediction: { kind: 'frame-property', prompt: 'Which property fails?', expectedProperty: 'symmetric', propertyChoices: ['symmetric', 'serial'] } }
    expect(auditMission(missingSymmetry).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')

    const scopes: GameLevel = { ...level, formula: 'p', prediction: { kind: 'scope-truth', prompt: 'Predict the three scopes.', expectedChoice: 'false,false,false' } }
    expect(auditMission(scopes).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')
  })

  it('validates statement-choice expected answers structurally', () => {
    const statements: GameLevel = { ...level, prediction: { kind: 'statement-choice', prompt: 'Which statement is right?', expectedChoice: 'right', statementChoices: [{ id: 'wrong', label: 'Wrong' }, { id: 'right', label: 'Right' }] } }
    expect(auditMission(statements).find(({ check }) => check === 'Expected answer')?.severity).toBe('pass')
    const missing: GameLevel = { ...statements, prediction: { ...statements.prediction!, expectedChoice: 'missing' } }
    expect(auditMission(missing).find(({ check }) => check === 'Expected answer')?.severity).toBe('error')
  })

  it('detects instructions that request locked controls or unknown worlds', () => {
    const inconsistent: GameLevel = { ...level, instruction: 'Add an edge to w9 and change the valuation.', editable: [] }
    const findings = auditMission(inconsistent)
    expect(findings.some(({ check, detail }) => check === 'Instruction/world consistency' && detail.includes('w9'))).toBe(true)
    expect(findings.some(({ check, detail }) => check === 'Instruction/editability consistency' && detail.includes('valuations'))).toBe(true)
    expect(findings.some(({ check, detail }) => check === 'Instruction/editability consistency' && detail.includes('edges'))).toBe(true)
  })

  it('warns when Hint 1 reproduces the complete reference edge set', () => {
    const withSpoiler: GameLevel = { ...level, hints: ['Use w0 -> w1.', 'Look for a witness.', 'Add w0 -> w1.'] }
    const solution = { worlds: level.worlds, edges: [{ from: 'w0', to: 'w1' }], evaluationWorld: 'w0' }
    expect(auditMission(withSpoiler, solution).find(({ check }) => check === 'Hint spoiler')?.severity).toBe('warning')
  })

  it('labels bounded uniqueness conclusions as limited evidence', () => {
    const solution = { worlds: level.worlds, edges: [{ from: 'w0', to: 'w1' }], evaluationWorld: 'w0' }
    expect(auditMission(level, solution).find(({ check }) => check === 'Bounded solution scan')?.detail).toMatch(/bounded search|passing state/u)
  })
})
