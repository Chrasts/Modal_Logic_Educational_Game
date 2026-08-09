import type { GameLevel } from './campaign'

const atoms = (source: string): readonly string[] => source.split(/[\s,]+/u).filter(Boolean).sort()

const sortedPairs = (
  pairs: readonly { readonly from: string; readonly to: string }[] | undefined,
  worldName: (id: string) => string,
): readonly string[] => (pairs ?? []).map(({ from, to }) => `${worldName(from)}>${worldName(to)}`).sort()

const sortedRecord = <T>(record: Readonly<Record<string, T>> | undefined): Readonly<Record<string, T>> =>
  Object.fromEntries(Object.entries(record ?? {}).sort(([left], [right]) => left.localeCompare(right)))

/**
 * Produces a stable, position-independent description of an authored task.
 * It deliberately keeps objective and edit permissions in the fingerprint:
 * repeating a graph is acceptable when the learner has to make a genuinely
 * different semantic decision.
 */
export function createLevelFingerprint(level: GameLevel): string {
  const worldNames = new Map(level.worlds.map(({ id }, index) => [id, `w${index}`]))
  const worldName = (id: string) => worldNames.get(id) ?? id
  const normalizedAtomRequirements = (requirements: Readonly<Record<string, readonly string[]>> | undefined) => {
    const entries: [string, readonly string[]][] = Object.entries(requirements ?? {}).map(([id, values]) => [worldName(id), [...values].sort()])
    return Object.fromEntries(entries.sort((left, right) => left[0].localeCompare(right[0])))
  }
  const constraints = level.constraints
  const normalizeConstraints = (source: GameLevel['constraints']) => source ? {
    minimumWorlds: source.minimumWorlds ?? null,
    maximumWorlds: source.maximumWorlds ?? null,
    minimumEdges: source.minimumEdges ?? null,
    maximumEdges: source.maximumEdges ?? null,
    maximumChanges: source.maximumChanges ?? null,
    requiredAtoms: normalizedAtomRequirements(source.requiredAtoms),
    forbiddenAtoms: normalizedAtomRequirements(source.forbiddenAtoms),
    requiredEdges: sortedPairs(source.requiredEdges, worldName),
    forbiddenEdges: sortedPairs(source.forbiddenEdges, worldName),
    requiredProperties: [...(source.requiredProperties ?? [])].sort(),
    forbiddenProperties: [...(source.forbiddenProperties ?? [])].sort(),
  } : null

  return JSON.stringify({
    objectiveKind: level.objectiveKind ?? 'semantic',
    interactionMode: level.interactionMode ?? 'construction',
    formula: level.formula?.replace(/\s+/gu, ' ').trim() ?? null,
    comparisonFormula: level.comparisonFormula?.replace(/\s+/gu, ' ').trim() ?? null,
    comparisonTarget: level.comparisonTarget ?? null,
    prediction: level.prediction ? {
      kind: level.prediction.kind,
      expectedProperty: level.prediction.expectedProperty ?? null,
      expectedChoice: level.prediction.expectedChoice ?? null,
      mustBeCorrect: level.prediction.mustBeCorrect ?? false,
      propertyChoices: [...(level.prediction.propertyChoices ?? [])].sort(),
      worldChoices: [...(level.prediction.worldChoices ?? [])].map(worldName).sort(),
      statementChoices: [...(level.prediction.statementChoices ?? [])].map(({ id, label }) => ({ id, label })).sort((left, right) => left.id.localeCompare(right.id)),
      countervaluationChoices: [...(level.prediction.countervaluationChoices ?? [])].map((choice) => ({
        id: choice.id,
        valuation: normalizedAtomRequirements(choice.valuation),
      })).sort((left, right) => left.id.localeCompare(right.id)),
      modelChoices: [...(level.prediction.modelChoices ?? [])].map((choice) => ({
        id: choice.id,
        evaluationWorld: worldName(choice.evaluationWorld),
        worlds: choice.worlds.map((world) => ({ id: worldName(world.id), atoms: atoms(world.atoms) })),
        edges: sortedPairs(choice.edges, worldName),
      })).sort((left, right) => left.id.localeCompare(right.id)),
    } : null,
    scope: level.scope ?? null,
    targetTruth: level.targetTruth ?? null,
    evaluationWorld: worldName(level.evaluationWorld),
    worldCount: level.worlds.length,
    valuations: level.worlds.map(({ atoms: source }) => atoms(source)),
    edges: sortedPairs(level.edges, worldName),
    editable: [...level.editable].sort(),
    constraints: normalizeConstraints(constraints),
    bonusConstraints: normalizeConstraints(level.bonusConstraints),
    frameRules: sortedRecord(level.frameRules),
    requiredFrameRules: sortedRecord(level.requiredFrameRules),
    correspondencePreset: level.correspondencePreset ?? null,
    scopeComparisonEvaluationWorld: level.scopeComparison ? worldName(level.scopeComparison.evaluationWorld) : null,
    requiredEvaluationWorld: level.structuralObjective?.requiredEvaluationWorld
      ? worldName(level.structuralObjective.requiredEvaluationWorld)
      : null,
  })
}
