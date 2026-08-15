import { describe, expect, it } from 'vitest'
import { createModel } from './model'
import { parseFormula } from './parser'
import { buildSemanticHighlight, evaluateFormulaAcrossWorlds, formulaAtPath, listFormulaOccurrences } from './evaluation-explorer'

describe('evaluation explorer', () => {
  const model = createModel({ w0: [], w1: ['p'], w2: [] }, [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])

  it('preserves occurrence identity for duplicate subformulas', () => {
    const formula = parseFormula('p ∧ p')
    const occurrences = listFormulaOccurrences(formula)
    expect(occurrences.map(({ key }) => key)).toEqual(['root', 'left', 'right'])
    expect(formulaAtPath(formula, ['right'])).toEqual({ kind: 'atom', name: 'p' })
  })

  it('evaluates an atom across every world', () => {
    expect(Object.fromEntries(evaluateFormulaAcrossWorlds(model, parseFormula('p')))).toEqual({ w0: false, w1: true, w2: false })
  })

  it('derives box counterexamples and diamond witnesses from evaluator traces', () => {
    const box = buildSemanticHighlight(model, parseFormula('□p'), 'w0')
    expect(box.trace?.value).toBe(false)
    expect([...box.relevantEdges]).toHaveLength(2)
    expect([...box.counterexampleWorlds]).toEqual(['w2'])
    const diamond = buildSemanticHighlight(model, parseFormula('◇p'), 'w0')
    expect(diamond.trace?.value).toBe(true)
    expect([...diamond.witnessWorlds]).toEqual(['w1'])
  })

  it('explains modal failure and vacuous truth with and without successors', () => {
    const empty = createModel({ w0: [] })
    expect(buildSemanticHighlight(empty, parseFormula('□p'), 'w0').trace?.summary).toMatch(/vacuously true/i)
    expect(buildSemanticHighlight(empty, parseFormula('◇p'), 'w0').trace?.summary).toMatch(/no successors/i)
    expect(buildSemanticHighlight(model, parseFormula('◇q'), 'w0').trace?.value).toBe(false)
  })
})
