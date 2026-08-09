import { describe, expect, it } from 'vitest'
import type { GameLevel } from './campaign'
import { isConstructionLevel, validateLevelObjective } from './campaign'
import { learnCourse, learnLessons } from './learn'
import { checkConstructionConstraints, checkFrameProperty, parseFormula, verifyConstructionObjective, verifyObjective, type FramePropertyName } from './logic'

type Edge = { from: string; to: string }
type State = { worldIds: string[]; edges: Edge[]; valuation: Record<string, string[]>; evaluationWorld: string }
type Override = Partial<State>

const task = (id: string) => learnLessons.find((item) => item.id === id)!.task
const initial = (level: GameLevel): State => ({
  worldIds: level.worlds.map(({ id }) => id), edges: [...level.edges],
  valuation: Object.fromEntries(level.worlds.map(({ id, atoms }) => [id, atoms.split(/[\s,]+/u).filter(Boolean)])),
  evaluationWorld: level.evaluationWorld,
})
const state = (level: GameLevel, override: Override): State => ({ ...initial(level), ...override })
const correspondenceProperty: Record<string, FramePropertyName> = { t: 'reflexive', d: 'serial', b: 'symmetric', '4': 'transitive', '5': 'euclidean' }

function passes(level: GameLevel, candidate: State): boolean {
  const baseline = initial(level)
  const input = { worldIds: candidate.worldIds, explicitEdges: candidate.edges, effectiveEdges: candidate.edges, valuation: candidate.valuation, baseline: { worldIds: baseline.worldIds, explicitEdges: baseline.edges, valuation: baseline.valuation } }
  if (checkConstructionConstraints(input, level.constraints ?? {}).length) return false
  for (const [property, mode] of Object.entries(level.frameRules ?? {})) if (mode !== 'off' && !checkFrameProperty(candidate.worldIds, candidate.edges, property as FramePropertyName).holds) return false
  if (isConstructionLevel(level)) return verifyConstructionObjective(level.structuralObjective ?? {}, { evaluationWorld: candidate.evaluationWorld }).success
  return verifyObjective({ scope: level.scope!, targetTruth: level.targetTruth!, evaluationWorld: candidate.evaluationWorld, comparisonTarget: level.comparisonTarget, correspondenceProperty: level.correspondencePreset ? correspondenceProperty[level.correspondencePreset] : undefined }, {
    worldIds: candidate.worldIds, edges: candidate.edges, valuation: candidate.valuation,
    formula: parseFormula(level.formula!), comparisonFormula: level.comparisonFormula ? parseFormula(level.comparisonFormula) : undefined,
  }).success
}

const solutions: Record<string, Override> = {
  'learn-necessity-one-successor': { valuation: { w0: [], w1: ['p'] } },
  'learn-necessity-every-successor': { valuation: { w0: [], w1: ['p'], w2: ['p'] } },
  'learn-necessity-inaccessible': { valuation: { w0: [], w1: [], w2: [] } },
  'learn-necessity-repair': { valuation: { w0: [], w1: ['p'], w2: ['p'] } },
  'learn-box-diamond-possible-not-necessary': { valuation: { w0: [], w1: ['p'], w2: [] } },
  'learn-box-diamond-neither': { valuation: { w0: [], w1: [], w2: [] } },
  'learn-box-diamond-both': { edges: [{ from: 'w0', to: 'w1' }] },
  'learn-box-diamond-necessary-not-possible': { edges: [] },
  'learn-nested-double-diamond': { valuation: { w0: [], w1: [], w2: ['p'] } },
  'learn-nested-box-diamond': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w3' }, { from: 'w2', to: 'w3' }] },
  'learn-nested-double-box': { valuation: { w0: [], w1: [], w2: [], w3: ['p'], w4: ['p'] } },
  'learn-nested-order': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w1', to: 'w3' }] },
  'learn-scopes-model': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }] },
  'learn-scopes-frame': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }] },
  'learn-countermodels-valuation': { valuation: { w0: [], w1: ['p'], w2: [] } },
  'learn-countermodels-relation': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }] },
  'learn-countermodels-build': { worldIds: ['w0', 'w1'], edges: [{ from: 'w0', to: 'w1' }], valuation: { w0: [], w1: ['p'] } },
  'learn-countermodels-smaller': { worldIds: ['w0', 'w1', 'w2'], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], valuation: { w0: [], w1: ['p'], w2: [] } },
  'learn-frames-reflexive': { edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' }] },
  'learn-frames-serial': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w2' }] },
  'learn-frames-symmetric': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }] },
  'learn-frames-transitive': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }] },
  'learn-frames-euclidean': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }] },
  'learn-frames-combination': { edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' }, { from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }] },
}

const distractors: Record<string, Override> = {
  'learn-necessity-one-successor': { valuation: { w0: ['p'], w1: [] } },
  'learn-necessity-every-successor': { valuation: { w0: ['p'], w1: ['p'], w2: [] } },
  'learn-necessity-inaccessible': { valuation: { w0: [], w1: ['p'], w2: ['p'] } },
  'learn-necessity-repair': { valuation: { w0: [], w1: ['q'], w2: ['p'] } },
  'learn-box-diamond-possible-not-necessary': { valuation: { w0: ['p'], w1: ['p'], w2: ['p'] } },
  'learn-box-diamond-neither': { valuation: { w0: [], w1: ['p'], w2: ['p'] } },
  'learn-box-diamond-both': { edges: [{ from: 'w0', to: 'w2' }] },
  'learn-box-diamond-necessary-not-possible': { valuation: { w0: [], w1: [] } },
  'learn-nested-double-diamond': { valuation: { w0: [], w1: ['p'], w2: [] } },
  'learn-nested-box-diamond': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w3' }, { from: 'w2', to: 'w2' }] },
  'learn-nested-double-box': { valuation: { w0: [], w1: [], w2: ['p'], w3: ['p'], w4: [] } },
  'learn-nested-order': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w3' }] },
  'learn-scopes-model': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w0' }] },
  'learn-scopes-frame': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w0' }] },
  'learn-countermodels-valuation': { valuation: { w0: ['p'], w1: [], w2: [] } },
  'learn-countermodels-relation': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }] },
  'learn-countermodels-build': { worldIds: ['w0', 'w1'], edges: [{ from: 'w0', to: 'w1' }], valuation: { w0: ['p'], w1: ['p'] } },
  'learn-countermodels-smaller': { worldIds: ['w0', 'w2', 'w3'], edges: [{ from: 'w0', to: 'w2' }, { from: 'w3', to: 'w3' }], valuation: { w0: [], w2: [], w3: ['q'] } },
  'learn-frames-reflexive': { edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w0', to: 'w1' }] },
  'learn-frames-serial': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w1', to: 'w0' }] },
  'learn-frames-symmetric': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }] },
  'learn-frames-transitive': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w0' }] },
  'learn-frames-euclidean': { edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w0' }] },
  'learn-frames-combination': { edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }, { from: 'w2', to: 'w2' }, { from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }] },
}

describe('remaining Learn chapters', () => {
  it('validates every new lesson and keeps all authored identities unique', () => {
    const newLessons = learnCourse.chapters.slice(3).flatMap(({ lessons }) => lessons)
    expect(newLessons).toHaveLength(35)
    expect(newLessons.map(({ id }) => id)).toEqual([
      'learn-necessity-one-successor', 'learn-necessity-every-successor', 'learn-necessity-counterexample', 'learn-necessity-inaccessible', 'learn-necessity-vacuous', 'learn-necessity-repair',
      'learn-box-diamond-possible-not-necessary', 'learn-box-diamond-neither', 'learn-box-diamond-both', 'learn-box-diamond-necessary-not-possible', 'learn-box-diamond-diamond-duality', 'learn-box-diamond-box-duality',
      'learn-nested-double-diamond', 'learn-nested-box-diamond', 'learn-nested-diamond-box', 'learn-nested-double-box', 'learn-nested-order',
      'learn-scopes-pointed', 'learn-scopes-model', 'learn-scopes-local-not-global', 'learn-scopes-frame', 'learn-scopes-comparison',
      'learn-countermodels-locate', 'learn-countermodels-valuation', 'learn-countermodels-relation', 'learn-countermodels-build', 'learn-countermodels-global', 'learn-countermodels-countervaluation', 'learn-countermodels-smaller',
      'learn-frames-reflexive', 'learn-frames-serial', 'learn-frames-symmetric', 'learn-frames-transitive', 'learn-frames-euclidean', 'learn-frames-combination',
    ])
    expect(new Set(newLessons.map(({ id }) => id)).size).toBe(35)
    expect(new Set(newLessons.map(({ task }) => task.id)).size).toBe(35)
    for (const lesson of newLessons) {
      expect(() => validateLevelObjective(lesson.task), lesson.id).not.toThrow()
      if (lesson.task.formula) expect(() => parseFormula(lesson.task.formula!), lesson.id).not.toThrow()
      if (lesson.task.comparisonFormula) expect(() => parseFormula(lesson.task.comparisonFormula!), lesson.id).not.toThrow()
      expect(lesson.task.worlds.some(({ id }) => id === lesson.task.evaluationWorld), lesson.id).toBe(true)
      expect(lesson.hints, lesson.id).toHaveLength(3)
      if (isConstructionLevel(lesson.task)) expect(lesson.task).not.toHaveProperty('formula')
    }
  })

  it('starts every editing mission incomplete, accepts its intended solution, and rejects a key distractor', () => {
    expect(Object.keys(solutions)).toEqual(Object.keys(distractors))
    for (const id of Object.keys(solutions)) {
      const level = task(id)
      expect(passes(level, initial(level)), `${id} initial`).toBe(false)
      expect(passes(level, state(level, solutions[id])), `${id} intended`).toBe(true)
      expect(passes(level, state(level, distractors[id])), `${id} distractor`).toBe(false)
    }
  })

  it('gates every required identification answer', () => {
    const expected: Record<string, string> = {
      'learn-necessity-counterexample': 'w2',
      'learn-nested-diamond-box': 'w2',
      'learn-scopes-local-not-global': 'w2',
      'learn-countermodels-locate': 'w0',
      'learn-countermodels-global': 'w2',
      'learn-countermodels-countervaluation': 'p-false-at-w0-true-at-w1',
      'learn-scopes-comparison': 'pointed-true-model-false-frame-false',
    }
    for (const [id, answer] of Object.entries(expected)) {
      const prediction = task(id).prediction!
      const accepted = (candidate: string) => Boolean(candidate && prediction.mustBeCorrect && candidate === prediction.expectedChoice)
      expect(accepted(''), `${id} missing`).toBe(false)
      expect(accepted('__wrong__'), `${id} wrong`).toBe(false)
      expect(accepted(answer), `${id} correct`).toBe(true)
    }
  })

  it('checks both dualities as read-only frame questions', () => {
    const diamond = task('learn-box-diamond-diamond-duality')
    const box = task('learn-box-diamond-box-duality')
    expect(passes(diamond, initial(diamond))).toBe(true)
    expect(passes(box, initial(box))).toBe(true)
    expect(diamond).toMatchObject({ interactionMode: 'question', editable: [], formula: '(◇p → ¬□¬p) ∧ (¬□¬p → ◇p)' })
    expect(box).toMatchObject({ interactionMode: 'question', editable: [], formula: '(□p → ¬◇¬p) ∧ (¬◇¬p → □p)' })
    expect(diamond.briefing).toMatch(/every world under every valuation on this fixed relation/i)
    expect(box.briefing).toMatch(/every world under every valuation on this fixed relation/i)
  })

  it('keeps the vacuous-necessity transfer task initially incomplete and accepts its one required edge', () => {
    const transfer = learnLessons.find(({ id }) => id === 'learn-necessity-vacuous')!.transferTask!
    expect(transfer.id).toBe('learn-necessity-vacuous-transfer')
    expect(passes(transfer, initial(transfer))).toBe(false)
    expect(passes(transfer, state(transfer, { edges: [{ from: 'w0', to: 'w1' }] }))).toBe(true)
    expect(passes(transfer, state(transfer, { edges: [{ from: 'w0', to: 'w0' }] }))).toBe(false)
  })
})
