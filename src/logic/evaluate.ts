import { formatFormula, type Formula } from './formula'
import { successors, type KripkeModel, type WorldId } from './model'

/** Returns whether M, worldId |= formula under standard Kripke semantics. */
export function evaluate(model: KripkeModel, worldId: WorldId, formula: Formula): boolean {
  return evaluateWithExplanation(model, worldId, formula).value
}

export interface EvaluationResult {
  readonly value: boolean
  readonly explanation: string
}

/** Evaluates a formula and provides a deterministic, human-readable reason. */
export function evaluateWithExplanation(
  model: KripkeModel,
  worldId: WorldId,
  formula: Formula,
): EvaluationResult {
  const world = model.worlds.get(worldId)
  if (!world) throw new Error(`Unknown world: ${worldId}`)

  switch (formula.kind) {
    case 'atom': {
      const value = world.valuation.has(formula.name)
      return { value, explanation: `${formula.name} ${value ? 'belongs' : 'does not belong'} to the valuation at ${worldId}.` }
    }
    case 'not': {
      const operand = evaluateWithExplanation(model, worldId, formula.operand)
      return { value: !operand.value, explanation: `¬${formatFormula(formula.operand)} reverses the truth value: ${operand.explanation}` }
    }
    case 'and': {
      const left = evaluateWithExplanation(model, worldId, formula.left)
      if (!left.value) return { value: false, explanation: `The conjunction is false because ${left.explanation}` }
      const right = evaluateWithExplanation(model, worldId, formula.right)
      return right.value
        ? { value: true, explanation: `Both conjuncts are true at ${worldId}.` }
        : { value: false, explanation: `The conjunction is false because ${right.explanation}` }
    }
    case 'or': {
      const left = evaluateWithExplanation(model, worldId, formula.left)
      if (left.value) return { value: true, explanation: `The disjunction is true because ${left.explanation}` }
      const right = evaluateWithExplanation(model, worldId, formula.right)
      return right.value
        ? { value: true, explanation: `The disjunction is true because ${right.explanation}` }
        : { value: false, explanation: `Neither disjunct is true at ${worldId}.` }
    }
    case 'implies': {
      const left = evaluateWithExplanation(model, worldId, formula.left)
      if (!left.value) return { value: true, explanation: `The implication is true because its antecedent is false at ${worldId}.` }
      const right = evaluateWithExplanation(model, worldId, formula.right)
      return right.value
        ? { value: true, explanation: `The implication is true because its consequent is true at ${worldId}.` }
        : { value: false, explanation: `The implication is false: its antecedent is true but its consequent is false at ${worldId}.` }
    }
    case 'box': {
      const nextWorlds = successors(model, worldId)
      if (nextWorlds.length === 0) {
        return { value: true, explanation: `□${formatFormula(formula.operand)} is vacuously true at ${worldId}, because the world has no successors.` }
      }
      for (const next of nextWorlds) {
        const result = evaluateWithExplanation(model, next, formula.operand)
        if (!result.value) {
          return { value: false, explanation: `□${formatFormula(formula.operand)} is false: ${worldId} R ${next}, and the formula is false at ${next}.` }
        }
      }
      return { value: true, explanation: `□${formatFormula(formula.operand)} is true at all ${nextWorlds.length} worlds accessible from ${worldId}.` }
    }
    case 'diamond': {
      const nextWorlds = successors(model, worldId)
      for (const next of nextWorlds) {
        const result = evaluateWithExplanation(model, next, formula.operand)
        if (result.value) {
          return { value: true, explanation: `◇${formatFormula(formula.operand)} is true: ${worldId} R ${next}, and the formula is true at ${next}.` }
        }
      }
      return nextWorlds.length === 0
        ? { value: false, explanation: `◇${formatFormula(formula.operand)} is false because ${worldId} has no successors.` }
        : { value: false, explanation: `◇${formatFormula(formula.operand)} is false at every world accessible from ${worldId}.` }
    }
  }
}
