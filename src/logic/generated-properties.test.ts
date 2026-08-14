import { describe, expect, it } from 'vitest'
import { applyFrameProperties, checkFrameProperty, type FramePropertyName } from './frame'
import { parseFormula } from './parser'
import { checkFrameValidity } from './validity'
import { evaluate } from './evaluate'
import { formatFormula } from './formula'
import { canonicalModelSignature } from './isomorphism'
import { createModel } from './model'
import { checkConstructionConstraints } from './constraints'
import type { AccessibilityEdge } from './model'

const allRelations = (worldIds: readonly string[]): AccessibilityEdge[][] => {
  const pairs = worldIds.flatMap((from) => worldIds.map((to) => ({ from, to })))
  return Array.from({ length: 2 ** pairs.length }, (_, mask) => pairs.filter((_, index) => (mask & (2 ** index)) !== 0))
}

describe('generated finite-frame properties', () => {
  it('makes every individually enforced closure property hold on all frames up to three worlds', () => {
    const enforceable: readonly FramePropertyName[] = ['reflexive', 'symmetric', 'transitive', 'euclidean']
    const failures: string[] = []
    for (let size = 1; size <= 3; size += 1) {
      const worlds = Array.from({ length: size }, (_, index) => `w${index}`)
      for (const edges of allRelations(worlds)) {
        for (const property of enforceable) {
          const closure = applyFrameProperties(worlds, edges, {
            reflexive: property === 'reflexive', symmetric: property === 'symmetric',
            transitive: property === 'transitive', euclidean: property === 'euclidean',
          })
          if (!checkFrameProperty(worlds, closure, property).holds) failures.push(`${property} closure failed on ${size} worlds: ${JSON.stringify(edges)}`)
          const closurePairs = new Set(closure.map(({ from, to }) => `${from}\u0000${to}`))
          if (edges.some(({ from, to }) => !closurePairs.has(`${from}\u0000${to}`))) failures.push(`${property} closure removed an edge on ${size} worlds`)
          const repeated = applyFrameProperties(worlds, closure, {
            reflexive: property === 'reflexive', symmetric: property === 'symmetric',
            transitive: property === 'transitive', euclidean: property === 'euclidean',
          })
          expect(new Set(repeated.map(({ from, to }) => `${from}\u0000${to}`))).toEqual(closurePairs)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('matches standard axiom validity with its frame property on every frame up to three worlds', () => {
    const correspondences = ([
      ['box p -> p', 'reflexive'],
      ['box p -> diamond p', 'serial'],
      ['p -> box diamond p', 'symmetric'],
      ['box p -> box box p', 'transitive'],
      ['diamond p -> box diamond p', 'euclidean'],
    ] as const).map(([source, property]) => ({ source, property, formula: parseFormula(source) }))
    const failures: string[] = []
    for (let size = 1; size <= 3; size += 1) {
      const worlds = Array.from({ length: size }, (_, index) => `w${index}`)
      for (const edges of allRelations(worlds)) {
        for (const { source, property, formula } of correspondences) {
          const validity = checkFrameValidity(worlds, edges, formula).valid
          const propertyHolds = checkFrameProperty(worlds, edges, property).holds
          if (validity !== propertyHolds) failures.push(`${source}/${property} disagreed on ${JSON.stringify(edges)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('preserves both modal dualities for representative formulas on generated finite models', () => {
    const operands = ['p', '!p', 'p & q', 'diamond p', 'box (p -> q)']
    for (let size = 1; size <= 2; size += 1) {
      const worlds = Array.from({ length: size }, (_, index) => `w${index}`)
      for (const edges of allRelations(worlds)) {
        for (let valuationMask = 0; valuationMask < 2 ** (size * 2); valuationMask += 1) {
          const valuation = Object.fromEntries(worlds.map((world, index) => [world, ['p', 'q'].filter((_, atomIndex) => valuationMask & (2 ** (index * 2 + atomIndex)))]))
          const model = createModel(valuation, edges)
          for (const world of worlds) {
            for (const operand of operands) {
              expect(evaluate(model, world, parseFormula(`diamond (${operand})`))).toBe(evaluate(model, world, parseFormula(`! box !(${operand})`)))
              expect(evaluate(model, world, parseFormula(`box (${operand})`))).toBe(evaluate(model, world, parseFormula(`! diamond !(${operand})`)))
            }
          }
        }
      }
    }
  })

  it('round-trips canonical formatting without changing the formula tree', () => {
    for (const source of ['p', '!p', 'box (p -> diamond q)', 'diamond box p & !q', '(p | q) -> box diamond p']) {
      const parsed = parseFormula(source)
      expect(parseFormula(formatFormula(parsed))).toEqual(parsed)
    }
  })

  it('keeps signatures and evaluation invariant under a world renaming', () => {
    const original = {
      worldIds: ['w0', 'w1', 'w2'],
      edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }],
      valuation: { w0: ['q'], w1: [], w2: ['p'] },
      evaluationWorld: 'w0',
    }
    const renamed = {
      worldIds: ['gamma', 'alpha', 'beta'],
      edges: [{ from: 'gamma', to: 'alpha' }, { from: 'alpha', to: 'beta' }],
      valuation: { gamma: ['q'], alpha: [], beta: ['p'] },
      evaluationWorld: 'gamma',
    }
    expect(canonicalModelSignature(original)).toBe(canonicalModelSignature(renamed))
    const formula = parseFormula('diamond diamond p')
    expect(evaluate(createModel(original.valuation, original.edges), 'w0', formula))
      .toBe(evaluate(createModel(renamed.valuation, renamed.edges), 'gamma', formula))
  })

  it('agrees with an independently enumerated finite-frame validity check', () => {
    const sources = ['p -> p', 'box p -> p', 'diamond (p & q) -> diamond p', 'box (p -> q) -> (box p -> box q)']
    const independentValidity = (worldIds: readonly string[], edges: readonly AccessibilityEdge[], source: string) => {
      const formula = parseFormula(source)
      const atoms = ['p', 'q']
      for (let mask = 0; mask < 2 ** (worldIds.length * atoms.length); mask += 1) {
        const valuation = Object.fromEntries(worldIds.map((world, worldIndex) => [world, atoms.filter((_, atomIndex) => mask & 2 ** (worldIndex * atoms.length + atomIndex))]))
        const model = createModel(valuation, edges)
        if (worldIds.some((world) => !evaluate(model, world, formula))) return false
      }
      return true
    }
    for (let size = 1; size <= 2; size += 1) {
      const worlds = Array.from({ length: size }, (_, index) => `w${index}`)
      for (const edges of allRelations(worlds)) for (const source of sources) {
        expect(checkFrameValidity(worlds, edges, parseFormula(source)).valid).toBe(independentValidity(worlds, edges, source))
      }
    }
  })

  it('keeps derived-edge visibility separate from the effective semantic relation', () => {
    const worlds = ['w0', 'w1', 'w2']
    const explicitEdges = [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }]
    const effectiveEdges = applyFrameProperties(worlds, explicitEdges, { reflexive: false, symmetric: false, transitive: true, euclidean: false })
    const formula = parseFormula('diamond p')
    const valuation = { w0: [], w1: [], w2: ['p'] }
    expect(evaluate(createModel(valuation, explicitEdges), 'w0', formula)).toBe(false)
    const semanticResult = (_showDerivedEdges: boolean) => evaluate(createModel(valuation, effectiveEdges), 'w0', formula)
    expect(semanticResult(false)).toBe(true)
    expect(semanticResult(true)).toBe(true)
  })

  it('uses explicit edges for edge constraints and effective edges for frame properties', () => {
    const input = {
      worldIds: ['w0', 'w1', 'w2'],
      explicitEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }],
      effectiveEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }],
      valuation: { w0: [], w1: [], w2: [] },
    }
    const violations = checkConstructionConstraints(input, { maximumEdges: 2, requiredEdges: [{ from: 'w0', to: 'w2' }], requiredProperties: ['transitive'] })
    expect(violations).toEqual(['Required edge w0Rw2 is missing.'])
  })
})
