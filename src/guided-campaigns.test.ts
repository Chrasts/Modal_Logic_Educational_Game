import { describe, expect, it } from 'vitest'
import { countermodelHunter, guidedCampaigns } from './guided-campaigns'
import { checkConstructionConstraints, checkFrameProperty, parseFormula, verifyObjective } from './logic'

const valuation = (worlds: readonly { readonly id: string; readonly atoms: string }[]) => Object.fromEntries(
  worlds.map((world) => [world.id, world.atoms.split(/[\s,]+/u).filter(Boolean)]),
)

describe('Countermodel Hunter campaign data', () => {
  it('contains seven pointed countermodel missions with strategic hints', () => {
    expect(countermodelHunter.levels).toHaveLength(7)
    for (const level of countermodelHunter.levels) {
      expect(level.scope).toBe('pointed')
      expect(level.targetTruth).toBe(false)
      expect(level.hints).toHaveLength(3)
      expect(level.successDebrief).toBeTruthy()
      expect(() => parseFormula(level.formula)).not.toThrow()
    }
  })

  it('keeps every initial state unsolved and every reference construction valid', () => {
    for (const level of countermodelHunter.levels) {
      const initial = verifyObjective({ scope: level.scope, targetTruth: level.targetTruth, evaluationWorld: level.evaluationWorld }, { worldIds: level.worlds.map(({ id }) => id), edges: level.edges, valuation: valuation(level.worlds), formula: parseFormula(level.formula) })
      expect(initial.success, level.title).toBe(false)
      expect(level.referenceSolution, `${level.title} needs a reference solution`).toBeDefined()
      const solution = level.referenceSolution!
      const verdict = verifyObjective({ scope: level.scope, targetTruth: level.targetTruth, evaluationWorld: solution.evaluationWorld }, { worldIds: solution.worlds.map(({ id }) => id), edges: solution.edges, valuation: valuation(solution.worlds), formula: parseFormula(level.formula) })
      expect(verdict.success, level.title).toBe(true)
      if (level.constraints) expect(checkConstructionConstraints({ worldIds: solution.worlds.map(({ id }) => id), explicitEdges: solution.edges, effectiveEdges: solution.edges, valuation: valuation(solution.worlds) }, level.constraints), level.title).toEqual([])
    }
  })
})

describe('Frame Architect campaign data', () => {
  const campaign = guidedCampaigns.find(({ id }) => id === 'frame-architect')!

  it('contains seven property-focused missions with valid reference frames', () => {
    expect(campaign.levels).toHaveLength(7)
    for (const level of campaign.levels) {
      const solution = level.referenceSolution!
      expect(solution, level.title).toBeDefined()
      expect(checkConstructionConstraints({ worldIds: solution.worlds.map(({ id }) => id), explicitEdges: solution.edges, effectiveEdges: solution.edges, valuation: valuation(solution.worlds) }, level.constraints!), level.title).toEqual([])
    }
  })

  it('checks the required separation examples against the engine convention', () => {
    const byId = (id: string) => campaign.levels.find((level) => level.id === id)!.referenceSolution!
    const relation = (id: string) => { const solution = byId(id); return { worlds: solution.worlds.map(({ id: worldId }) => worldId), edges: solution.edges } }
    const symmetric = relation('architect-symmetric-not-transitive')
    expect(checkFrameProperty(symmetric.worlds, symmetric.edges, 'reflexive').holds).toBe(true)
    expect(checkFrameProperty(symmetric.worlds, symmetric.edges, 'symmetric').holds).toBe(true)
    expect(checkFrameProperty(symmetric.worlds, symmetric.edges, 'transitive').holds).toBe(false)
    const euclidean = relation('architect-euclidean-not-transitive')
    expect(checkFrameProperty(euclidean.worlds, euclidean.edges, 'euclidean').holds).toBe(true)
    expect(checkFrameProperty(euclidean.worlds, euclidean.edges, 'transitive').holds).toBe(false)
    const final = relation('architect-final-architecture')
    for (const property of ['reflexive', 'symmetric', 'transitive'] as const) expect(checkFrameProperty(final.worlds, final.edges, property).holds).toBe(true)
  })
})

describe('Formula Laboratory campaign data', () => {
  const campaign = guidedCampaigns.find(({ id }) => id === 'formula-laboratory')!

  it('contains eight parseable Formula A/B missions with validated reference outcomes', () => {
    expect(campaign.levels).toHaveLength(8)
    for (const level of campaign.levels) {
      const solution = level.referenceSolution!
      expect(level.comparisonFormula, level.title).toBeTruthy()
      const verdict = verifyObjective({ scope: level.scope, targetTruth: level.targetTruth, evaluationWorld: solution.evaluationWorld, comparisonTarget: level.comparisonTarget }, { worldIds: solution.worlds.map(({ id }) => id), edges: solution.edges, valuation: valuation(solution.worlds), formula: parseFormula(level.formula), comparisonFormula: parseFormula(level.comparisonFormula!) })
      expect(verdict.success, level.title).toBe(true)
      if (level.constraints) expect(checkConstructionConstraints({ worldIds: solution.worlds.map(({ id }) => id), explicitEdges: solution.edges, effectiveEdges: solution.edges, valuation: valuation(solution.worlds) }, level.constraints), level.title).toEqual([])
    }
  })
})
