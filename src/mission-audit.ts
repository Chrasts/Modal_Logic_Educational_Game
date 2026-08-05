import type { GameLevel, LevelEditPermission } from './campaign'
import {
  applyFrameProperties,
  canonicalModelSignature,
  checkConstructionConstraints,
  checkFrameProperty,
  collectAtoms,
  countConstructionChanges,
  createModel,
  evaluate,
  evaluateWithExplanation,
  parseFormula,
  verifyConstructionObjective,
  verifyObjective,
  type FramePropertyName,
  type ObjectiveVerdict,
} from './logic'
import { assertValidReferenceSolution, type ReferenceSolution } from './level-format'

export interface MissionAuditFinding {
  readonly severity: 'pass' | 'info' | 'warning' | 'error'
  readonly check: string
  readonly detail: string
  readonly step?: number
}

const correspondenceProperties: Readonly<Record<NonNullable<GameLevel['correspondencePreset']>, FramePropertyName>> = {
  t: 'reflexive', d: 'serial', b: 'symmetric', 4: 'transitive', 5: 'euclidean',
}
const edgeKey = ({ from, to }: { readonly from: string; readonly to: string }) => `${from}\u0000${to}`
const atomsAt = (atoms: string) => atoms.split(/[\s,]+/u).filter(Boolean)
const valuationFrom = (worlds: readonly { readonly id: string; readonly atoms: string }[]) => Object.fromEntries(worlds.map(({ id, atoms }) => [id, atomsAt(atoms)]))
const effectiveEdgesFor = (worldIds: readonly string[], edges: readonly { readonly from: string; readonly to: string }[], rules: GameLevel['frameRules'] = {}) => applyFrameProperties(worldIds, edges, {
  reflexive: rules.reflexive === 'enforce', symmetric: rules.symmetric === 'enforce', transitive: rules.transitive === 'enforce', euclidean: rules.euclidean === 'enforce',
})

const changedAreas = (level: GameLevel, solution: ReferenceSolution): ReadonlySet<LevelEditPermission> => {
  const changed = new Set<LevelEditPermission>()
  const initialIds = level.worlds.map(({ id }) => id)
  const solutionIds = solution.worlds.map(({ id }) => id)
  if (JSON.stringify(initialIds) !== JSON.stringify(solutionIds)) changed.add('worlds')
  const normalizedValuation = (worlds: readonly { readonly id: string; readonly atoms: string }[]) => Object.fromEntries(worlds.map(({ id, atoms }) => [id, atomsAt(atoms).sort()]))
  if (JSON.stringify(normalizedValuation(level.worlds)) !== JSON.stringify(normalizedValuation(solution.worlds))) changed.add('valuations')
  const pairs = (edges: readonly { readonly from: string; readonly to: string }[]) => edges.map(edgeKey).sort()
  if (JSON.stringify(pairs(level.edges)) !== JSON.stringify(pairs(solution.edges))) changed.add('edges')
  if (level.evaluationWorld !== solution.evaluationWorld) changed.add('evaluation')
  if (JSON.stringify(level.frameRules ?? {}) !== JSON.stringify(solution.frameRules ?? level.frameRules ?? {})) changed.add('constraints')
  return changed
}

const objectiveVerdict = (level: GameLevel, candidate: ReferenceSolution): ObjectiveVerdict => {
  if (level.objectiveKind === 'construction') return verifyConstructionObjective(level.structuralObjective ?? {}, { evaluationWorld: candidate.evaluationWorld })
  if (!level.formula || !level.scope || level.targetTruth === undefined) throw new Error('A semantic mission requires formula, scope, and target truth.')
  const worldIds = candidate.worlds.map(({ id }) => id)
  const edges = effectiveEdgesFor(worldIds, candidate.edges, candidate.frameRules ?? level.frameRules)
  return verifyObjective({
    scope: level.scope, targetTruth: level.targetTruth, evaluationWorld: candidate.evaluationWorld,
    correspondenceProperty: level.correspondencePreset ? correspondenceProperties[level.correspondencePreset] : undefined,
    comparisonTarget: level.comparisonTarget,
  }, {
    worldIds, edges, valuation: valuationFrom(candidate.worlds), formula: parseFormula(level.formula),
    comparisonFormula: level.comparisonFormula ? parseFormula(level.comparisonFormula) : undefined,
  })
}

const constraintFindings = (level: GameLevel): MissionAuditFinding[] => {
  const constraints = level.constraints
  if (!constraints) return [{ severity: 'pass', check: 'Constraint consistency', detail: 'No conflicting construction constraints are configured.', step: 5 }]
  const errors: string[] = []
  const ids = new Set(level.worlds.map(({ id }) => id))
  if (constraints.minimumWorlds !== undefined && constraints.maximumWorlds !== undefined && constraints.minimumWorlds > constraints.maximumWorlds) errors.push('minimumWorlds exceeds maximumWorlds')
  if (constraints.minimumEdges !== undefined && constraints.maximumEdges !== undefined && constraints.minimumEdges > constraints.maximumEdges) errors.push('minimumEdges exceeds maximumEdges')
  const requiredEdges = new Set((constraints.requiredEdges ?? []).map(edgeKey))
  const forbiddenEdges = new Set((constraints.forbiddenEdges ?? []).map(edgeKey))
  for (const edge of requiredEdges) if (forbiddenEdges.has(edge)) errors.push(`edge ${edge.replace('\u0000', ' → ')} is both required and forbidden`)
  for (const edge of [...constraints.requiredEdges ?? [], ...constraints.forbiddenEdges ?? []]) if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push(`edge ${edge.from} → ${edge.to} references an unknown world`)
  for (const [world, atoms] of Object.entries(constraints.requiredAtoms ?? {})) {
    if (!ids.has(world)) errors.push(`required atoms reference unknown world ${world}`)
    const forbidden = new Set(constraints.forbiddenAtoms?.[world] ?? [])
    for (const atom of atoms) if (forbidden.has(atom)) errors.push(`${atom} at ${world} is both required and forbidden`)
  }
  for (const world of Object.keys(constraints.forbiddenAtoms ?? {})) if (!ids.has(world)) errors.push(`forbidden atoms reference unknown world ${world}`)
  const forbiddenProperties = new Set(constraints.forbiddenProperties ?? [])
  for (const property of constraints.requiredProperties ?? []) if (forbiddenProperties.has(property)) errors.push(`${property} is both required and forbidden`)
  return errors.length
    ? errors.map((detail) => ({ severity: 'error' as const, check: 'Constraint consistency', detail, step: 5 }))
    : [{ severity: 'pass', check: 'Constraint consistency', detail: 'World, edge, atom, property, and bound constraints do not conflict.', step: 5 }]
}

const instructionFindings = (level: GameLevel): MissionAuditFinding[] => {
  const findings: MissionAuditFinding[] = []
  const instruction = level.instruction.trim()
  if (instruction.length < 18) findings.push({ severity: 'warning', check: 'Instruction', detail: 'The instruction may be too short to identify the required action.', step: 1 })
  else findings.push({ severity: 'pass', check: 'Instruction', detail: 'The instruction describes a concrete task.', step: 1 })
  const mentionedWorlds = [...new Set(instruction.match(/\bw\d+\b/giu) ?? [])]
  const known = new Set(level.worlds.map(({ id }) => id.toLowerCase()))
  for (const world of mentionedWorlds) if (!known.has(world.toLowerCase()) && !level.editable.includes('worlds')) findings.push({ severity: 'error', check: 'Instruction/world consistency', detail: `${world} is mentioned but does not exist and world creation is locked.`, step: 2 })
  const checks: readonly [RegExp, LevelEditPermission, string, number][] = [
    [/\b(valuation|atoms?|make\s+\w+\s+(?:true|false))\b/iu, 'valuations', 'valuation change', 4],
    [/\b(edge|arrow|relation|accessible|accessibility|connect|successor)\b/iu, 'edges', 'relation change', 4],
    [/\b(evaluation world|evaluate at|designated world)\b/iu, 'evaluation', 'evaluation-world change', 4],
  ]
  for (const [pattern, permission, label, step] of checks) if (pattern.test(instruction) && !level.editable.includes(permission)) findings.push({ severity: 'error', check: 'Instruction/editability consistency', detail: `The instruction requests a ${label}, but ${permission} is locked.`, step })
  if (level.objectiveKind === 'construction') {
    if (level.formula || level.scope || level.targetTruth !== undefined) findings.push({ severity: 'error', check: 'Objective shape', detail: 'A construction mission must not define semantic formula, scope, or truth target.', step: 3 })
    if (/\b(formula|true|false|valid|box|diamond|□|◇)\b/iu.test(instruction)) findings.push({ severity: 'warning', check: 'Objective wording', detail: 'Construction wording refers to semantic truth; confirm that this is intentional.', step: 1 })
  } else if (!level.formula || !level.scope || level.targetTruth === undefined) findings.push({ severity: 'error', check: 'Objective shape', detail: 'A semantic mission requires formula, scope, and target truth.', step: 3 })
  else findings.push({ severity: 'pass', check: 'Objective shape', detail: 'Semantic objective metadata is complete.', step: 3 })
  return findings
}

const predictionFinding = (level: GameLevel): MissionAuditFinding => {
  const prediction = level.prediction
  if (!prediction) return { severity: 'warning', check: 'Prediction', detail: 'Consider capturing the learner’s initial mental model before verification.', step: 6 }
  if (prediction.prompt.trim() === level.instruction.trim()) return { severity: 'warning', check: 'Prediction', detail: 'Use a prediction prompt distinct from the construction instruction.', step: 6 }
  if (level.objectiveKind === 'construction' || !level.formula || !level.scope || level.targetTruth === undefined) return { severity: 'pass', check: 'Expected answer', detail: 'The prediction is present; no semantic expected answer applies to this construction objective.', step: 6 }
  try {
    const base: ReferenceSolution = { worlds: level.worlds, edges: level.edges, evaluationWorld: level.evaluationWorld, frameRules: level.frameRules }
    const worldIds = level.worlds.map(({ id }) => id)
    const valuation = valuationFrom(level.worlds)
    const edges = effectiveEdgesFor(worldIds, level.edges, level.frameRules)
    const formula = parseFormula(level.formula)
    let correct = true
    let reason = 'The expected answer agrees with the configured model and objective.'
    if (prediction.kind === 'counterexample-world') {
      const verdict = objectiveVerdict({ ...level, targetTruth: true }, base)
      correct = Boolean(prediction.expectedChoice && verdict.formula.truthByWorld?.some(({ worldId, value }) => worldId === prediction.expectedChoice && !value))
      reason = correct ? reason : 'The expected counterexample world does not falsify the formula under the displayed valuation.'
    } else if (prediction.kind === 'world-choice') {
      const expected = prediction.expectedChoice
      const trace = evaluateWithExplanation(createModel(valuation, edges), level.evaluationWorld, formula).trace
      const modalRole = trace.rule === 'possibility' ? trace.children.some((child) => child.worldId === expected && child.value) : trace.rule === 'necessity' ? trace.children.some((child) => child.worldId === expected && !child.value) : false
      correct = Boolean(expected && worldIds.includes(expected) && modalRole)
      reason = correct ? reason : 'The expected world is not a witness/counterexample child of the evaluated modal formula.'
    } else if (prediction.kind === 'countervaluation') {
      const choice = prediction.countervaluationChoices?.find(({ id }) => id === prediction.expectedChoice)
      if (!choice) correct = false
      else {
        const countermodel = createModel(choice.valuation, edges)
        correct = level.scope === 'pointed'
          ? !evaluate(countermodel, level.evaluationWorld, formula)
          : worldIds.some((world) => !evaluate(countermodel, world, formula))
      }
      reason = correct ? reason : 'The expected countervaluation does not refute the formula on the configured frame.'
    } else if (prediction.kind === 'model-choice') {
      const choice = prediction.modelChoices?.find(({ id }) => id === prediction.expectedChoice)
      if (!choice) correct = false
      else {
        const candidate: ReferenceSolution = { worlds: choice.worlds.map((world, index) => ({ ...world, position: { x: index * 160, y: 100 } })), edges: choice.edges, evaluationWorld: choice.evaluationWorld }
        correct = objectiveVerdict(level, candidate).success
      }
      reason = correct ? reason : 'The expected candidate model does not satisfy the configured semantic target.'
    } else if (prediction.kind === 'frame-property') {
      const asksForFailure = /\b(fail|fails|failing|lack|lacks|missing|not)\b/iu.test(prediction.prompt)
      const propertyHolds = Boolean(prediction.expectedProperty && checkFrameProperty(worldIds, edges, prediction.expectedProperty).holds)
      correct = Boolean(prediction.expectedProperty && (asksForFailure ? !propertyHolds : propertyHolds))
      reason = correct ? reason : `The expected frame property does not ${asksForFailure ? 'fail' : 'hold'} on the configured relation as requested.`
    } else if (prediction.kind === 'scope-truth') {
      const actual = (['pointed', 'model', 'frame'] as const).map((scope) => String(verifyObjective({ scope, targetTruth: true, evaluationWorld: level.evaluationWorld }, { worldIds, edges, valuation, formula }).formula.holds)).join(',')
      correct = prediction.expectedChoice === actual
      reason = correct ? reason : `The expected scope tuple does not match the computed ${actual} result.`
    } else if (prediction.kind === 'statement-choice') {
      const choices = prediction.statementChoices ?? []
      const ids = choices.map(({ id }) => id)
      correct = Boolean(prediction.expectedChoice && ids.includes(prediction.expectedChoice) && new Set(ids).size === ids.length && choices.every(({ label }) => label.trim()))
      reason = correct ? reason : 'The expected statement is missing from a valid set of uniquely identified, labelled choices.'
    }
    return { severity: correct ? 'pass' : 'error', check: 'Expected answer', detail: reason, step: 6 }
  } catch (error) {
    return { severity: 'error', check: 'Expected answer', detail: error instanceof Error ? error.message : 'The expected answer could not be validated.', step: 6 }
  }
}

const hintFinding = (level: GameLevel, solution?: ReferenceSolution): MissionAuditFinding | undefined => {
  const firstHint = level.hints?.[0]?.trim()
  if (!firstHint || !solution) return undefined
  const normalized = firstHint.toLowerCase()
  const edgeSet = solution.edges.map(({ from, to }) => `${from} -> ${to}`.toLowerCase())
  const atomSet = solution.worlds.filter(({ atoms }) => atomsAt(atoms).length).map(({ id, atoms }) => `${id}: ${atomsAt(atoms).join(' ')}`.toLowerCase())
  const exactAnswer = level.prediction?.expectedChoice?.toLowerCase()
  const spoilsEdges = edgeSet.length > 0 && edgeSet.every((edge) => normalized.includes(edge))
  const spoilsAtoms = atomSet.length > 0 && atomSet.every((assignment) => normalized.includes(assignment))
  const spoilsAnswer = Boolean(exactAnswer && normalized.includes(exactAnswer))
  return spoilsEdges || spoilsAtoms || spoilsAnswer
    ? { severity: 'warning', check: 'Hint spoiler', detail: 'Hint 1 contains the complete reference edge/atom set or exact answer. Keep this detail for Hint 3.', step: 6 }
    : { severity: 'pass', check: 'Hint spoiler', detail: 'Hint 1 does not reproduce the complete reference construction or exact answer.', step: 6 }
}

const boundedSearchFinding = (level: GameLevel, hasValidReference: boolean): MissionAuditFinding => {
  if (level.objectiveKind === 'construction' || !level.formula || !level.scope || level.worlds.length > 3) return { severity: 'info', check: 'Bounded solution scan', detail: 'Uniqueness was not checked: this mission is outside the small semantic-search profile.', step: 8 }
  try {
    const worldIds = level.worlds.map(({ id }) => id)
    const atoms = [...new Set([...collectAtoms(parseFormula(level.formula)), ...level.worlds.flatMap(({ atoms }) => atomsAt(atoms))])]
    const edgeSlots = worldIds.length ** 2
    const valuationSlots = worldIds.length * atoms.length
    const stateCount = 2 ** (edgeSlots + valuationSlots)
    if (atoms.length > 2 || stateCount > 4_096) return { severity: 'info', check: 'Bounded solution scan', detail: `Uniqueness was not checked: ${stateCount.toLocaleString('en-US')} bounded states exceed the audit budget.`, step: 8 }
    const signatures = new Set<string>()
    for (let edgeMask = 0; edgeMask < 2 ** edgeSlots && signatures.size < 6; edgeMask += 1) {
      const edges = worldIds.flatMap((from, fromIndex) => worldIds.flatMap((to, toIndex) => edgeMask & (2 ** (fromIndex * worldIds.length + toIndex)) ? [{ from, to }] : []))
      for (let valuationMask = 0; valuationMask < 2 ** valuationSlots && signatures.size < 6; valuationMask += 1) {
        const worlds = worldIds.map((id, worldIndex) => ({ id, position: level.worlds[worldIndex].position, atoms: atoms.filter((_, atomIndex) => valuationMask & (2 ** (worldIndex * atoms.length + atomIndex))).join(' ') }))
        const valuation = valuationFrom(worlds)
        const effectiveEdges = effectiveEdgesFor(worldIds, edges, level.frameRules)
        const baseline = { worldIds, explicitEdges: level.edges, valuation: valuationFrom(level.worlds) }
        if (level.constraints && checkConstructionConstraints({ worldIds, explicitEdges: edges, effectiveEdges, valuation, baseline }, level.constraints).length) continue
        const candidate: ReferenceSolution = { worlds, edges, evaluationWorld: level.evaluationWorld, frameRules: level.frameRules }
        if (objectiveVerdict(level, candidate).success) signatures.add(canonicalModelSignature({ worldIds, edges: effectiveEdges, valuation, evaluationWorld: level.evaluationWorld }, { preserveEvaluationWorld: level.scope === 'pointed', includeValuation: true }))
      }
    }
    if (signatures.size === 0) return { severity: hasValidReference ? 'info' : 'error', check: 'Bounded solution scan', detail: hasValidReference ? 'No same-world-set alternative was found; the validated reference may use a different construction shape.' : 'No solution found within bounded search. This does not prove general unsolvability.', step: 8 }
    if (signatures.size > 4) return { severity: 'warning', check: 'Bounded solution scan', detail: 'Many distinct passing states were found within the bounded search. Review unintended solutions.', step: 8 }
    if (signatures.size > 1) return { severity: 'info', check: 'Bounded solution scan', detail: `Reference solution is not unique within the bounded search (${signatures.size} canonical passing states).`, step: 8 }
    return { severity: 'pass', check: 'Bounded solution scan', detail: 'One canonical passing state was found within the bounded search; this does not prove uniqueness.', step: 8 }
  } catch (error) {
    return { severity: 'info', check: 'Bounded solution scan', detail: `Uniqueness was not verified: ${error instanceof Error ? error.message : 'search unavailable'}`, step: 8 }
  }
}

export function auditMission(level: GameLevel, solution?: ReferenceSolution): readonly MissionAuditFinding[] {
  const findings: MissionAuditFinding[] = []
  findings.push(level.learningObjective?.trim()
    ? { severity: 'pass', check: 'Learning objective', detail: 'A learning objective is present.', step: 1 }
    : { severity: 'warning', check: 'Learning objective', detail: 'Add a learner-facing objective.', step: 1 })
  findings.push(...instructionFindings(level), ...constraintFindings(level))

  let initialPasses = false
  const initial: ReferenceSolution = { worlds: level.worlds, edges: level.edges, evaluationWorld: level.evaluationWorld, frameRules: level.frameRules }
  try {
    if (level.objectiveKind === 'construction') initialPasses = objectiveVerdict(level, initial).success
    else { assertValidReferenceSolution(level, initial); initialPasses = true }
  } catch { /* A failed objective or constraint means the initial state is not complete. */ }
  findings.push(initialPasses
    ? { severity: 'error', check: 'Initial state', detail: 'The captured start already satisfies the mission.', step: 2 }
    : { severity: 'pass', check: 'Initial state', detail: 'The captured start does not already pass.', step: 2 })

  let validReference = false
  if (!solution) findings.push({ severity: 'error', check: 'Reference solution', detail: 'Capture a passing reference solution before export.', step: 7 })
  else {
    try {
      assertValidReferenceSolution(level, solution)
      validReference = true
      findings.push({ severity: 'pass', check: 'Reference solution', detail: 'The reference construction passes all checks.', step: 7 })
      const changes = changedAreas(level, solution)
      const locked = [...changes].filter((area) => !level.editable.includes(area))
      findings.push(locked.length
        ? { severity: 'error', check: 'Editable controls', detail: `The solution changes locked area(s): ${locked.join(', ')}.`, step: 4 }
        : { severity: 'pass', check: 'Editable controls', detail: 'Every demonstrated solution change is available to the player.', step: 4 })
      const solutionIds = solution.worlds.map(({ id }) => id)
      const distance = countConstructionChanges({
        worldIds: solutionIds, explicitEdges: solution.edges, effectiveEdges: effectiveEdgesFor(solutionIds, solution.edges, solution.frameRules ?? level.frameRules), valuation: valuationFrom(solution.worlds),
        baseline: { worldIds: level.worlds.map(({ id }) => id), explicitEdges: level.edges, valuation: valuationFrom(level.worlds) },
      }) ?? 0
      if (distance === 0) findings.push({ severity: 'error', check: 'Reference distance', detail: 'Reference solution has semantic distance 0 from the start.', step: 7 })
      else if (distance === 1) findings.push({ severity: 'warning', check: 'Reference distance', detail: `${level.estimatedDifficulty === 'advanced' ? 'Advanced mission is only one semantic edit from completion. ' : ''}One semantic edit from completion.`, step: 7 })
      else findings.push({ severity: 'pass', check: 'Reference distance', detail: `Reference solution is ${distance} semantic edits from the start.`, step: 7 })
      if (level.constraints?.maximumChanges !== undefined && distance > level.constraints.maximumChanges) findings.push({ severity: 'error', check: 'Change budget', detail: `Reference needs ${distance} changes but maximumChanges is ${level.constraints.maximumChanges}.`, step: 5 })
    } catch (error) {
      findings.push({ severity: 'error', check: 'Reference solution', detail: error instanceof Error ? error.message : 'The reference solution is invalid.', step: 7 })
    }
  }

  try {
    const atomCount = level.formula ? collectAtoms(parseFormula(level.formula)).length : 0
    const valuationCount = 2 ** (level.worlds.length * atomCount)
    findings.push((level.scope === 'frame' || level.scope === 'correspondence') && valuationCount > 65_536
      ? { severity: 'error', check: 'Frame cost', detail: `${valuationCount.toLocaleString('en-US')} valuations exceed the runtime limit.`, step: 3 }
      : { severity: 'pass', check: 'Frame cost', detail: `${valuationCount.toLocaleString('en-US')} valuation(s) at the captured start.`, step: 3 })
  } catch (error) {
    findings.push({ severity: 'error', check: 'Formula', detail: error instanceof Error ? error.message : 'The formula cannot be parsed.', step: 3 })
  }
  findings.push(predictionFinding(level))
  const hint = hintFinding(level, solution)
  if (hint) findings.push(hint)
  findings.push(boundedSearchFinding(level, validReference))
  return findings
}
