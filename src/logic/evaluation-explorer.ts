import { evaluateWithExplanation, type EvaluationTrace } from './evaluate'
import { formatFormula, type Formula } from './formula'
import type { KripkeModel, WorldId } from './model'

export type FormulaPathSegment = 'operand' | 'left' | 'right'
export type FormulaPath = readonly FormulaPathSegment[]

export interface FormulaOccurrence {
  readonly path: FormulaPath
  readonly key: string
  readonly formula: Formula
  readonly formatted: string
  readonly depth: number
}

export interface SemanticHighlight {
  readonly sourceWorld?: WorldId
  readonly trueWorlds: ReadonlySet<WorldId>
  readonly falseWorlds: ReadonlySet<WorldId>
  readonly relevantEdges: ReadonlySet<string>
  readonly witnessWorlds: ReadonlySet<WorldId>
  readonly counterexampleWorlds: ReadonlySet<WorldId>
  readonly trace?: EvaluationTrace
}

export const formulaPathKey = (path: FormulaPath): string => path.length ? path.join('.') : 'root'

export function listFormulaOccurrences(formula: Formula): readonly FormulaOccurrence[] {
  const occurrences: FormulaOccurrence[] = []
  const visit = (current: Formula, path: FormulaPath): void => {
    occurrences.push({ path, key: formulaPathKey(path), formula: current, formatted: formatFormula(current), depth: path.length })
    if (current.kind === 'not' || current.kind === 'box' || current.kind === 'diamond') visit(current.operand, [...path, 'operand'])
    else if (current.kind !== 'atom') {
      visit(current.left, [...path, 'left'])
      visit(current.right, [...path, 'right'])
    }
  }
  visit(formula, [])
  return occurrences
}

export function formulaAtPath(formula: Formula, path: FormulaPath): Formula | null {
  let current = formula
  for (const segment of path) {
    if (segment === 'operand' && (current.kind === 'not' || current.kind === 'box' || current.kind === 'diamond')) current = current.operand
    else if (segment === 'left' && (current.kind === 'and' || current.kind === 'or' || current.kind === 'implies')) current = current.left
    else if (segment === 'right' && (current.kind === 'and' || current.kind === 'or' || current.kind === 'implies')) current = current.right
    else return null
  }
  return current
}

export function evaluateFormulaAcrossWorlds(model: KripkeModel, formula: Formula): ReadonlyMap<WorldId, boolean> {
  return new Map([...model.worlds.keys()].map((worldId) => [worldId, evaluateWithExplanation(model, worldId, formula).value]))
}

const edgeKey = (from: WorldId, to: WorldId) => `${from}\u0000${to}`

export function buildSemanticHighlight(model: KripkeModel, formula: Formula, evaluationWorld: WorldId): SemanticHighlight {
  const truthByWorld = evaluateFormulaAcrossWorlds(model, formula)
  const trueWorlds = new Set([...truthByWorld].filter(([, value]) => value).map(([world]) => world))
  const falseWorlds = new Set([...truthByWorld].filter(([, value]) => !value).map(([world]) => world))
  if (!model.worlds.has(evaluationWorld)) return { trueWorlds, falseWorlds, relevantEdges: new Set(), witnessWorlds: new Set(), counterexampleWorlds: new Set() }

  const trace = evaluateWithExplanation(model, evaluationWorld, formula).trace
  const relevantEdges = new Set<string>()
  const witnessWorlds = new Set<WorldId>()
  const counterexampleWorlds = new Set<WorldId>()
  if (formula.kind === 'box' || formula.kind === 'diamond') {
    trace.children.forEach((child) => relevantEdges.add(edgeKey(evaluationWorld, child.worldId)))
    if (formula.kind === 'box' && !trace.value) trace.children.filter((child) => !child.value).forEach((child) => counterexampleWorlds.add(child.worldId))
    if (formula.kind === 'diamond' && trace.value) trace.children.filter((child) => child.value).forEach((child) => witnessWorlds.add(child.worldId))
  }
  return { sourceWorld: evaluationWorld, trueWorlds, falseWorlds, relevantEdges, witnessWorlds, counterexampleWorlds, trace }
}
