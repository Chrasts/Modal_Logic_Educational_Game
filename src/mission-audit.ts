import type { GameLevel, LevelEditPermission } from './campaign'
import { collectAtoms, parseFormula } from './logic'
import { assertValidReferenceSolution, type ReferenceSolution } from './level-format'

export interface MissionAuditFinding {
  readonly severity: 'pass' | 'warning' | 'error'
  readonly check: string
  readonly detail: string
}

const changedAreas = (level: GameLevel, solution: ReferenceSolution): ReadonlySet<LevelEditPermission> => {
  const changed = new Set<LevelEditPermission>()
  const initialIds = level.worlds.map(({ id }) => id)
  const solutionIds = solution.worlds.map(({ id }) => id)
  if (JSON.stringify(initialIds) !== JSON.stringify(solutionIds)) changed.add('worlds')
  const initialValuation = Object.fromEntries(level.worlds.map(({ id, atoms }) => [id, atoms.split(/[\s,]+/u).filter(Boolean).sort()]))
  const solutionValuation = Object.fromEntries(solution.worlds.map(({ id, atoms }) => [id, atoms.split(/[\s,]+/u).filter(Boolean).sort()]))
  if (JSON.stringify(initialValuation) !== JSON.stringify(solutionValuation)) changed.add('valuations')
  const pairs = (edges: readonly { readonly from: string; readonly to: string }[]) => edges.map(({ from, to }) => `${from}\u0000${to}`).sort()
  if (JSON.stringify(pairs(level.edges)) !== JSON.stringify(pairs(solution.edges))) changed.add('edges')
  if (level.evaluationWorld !== solution.evaluationWorld) changed.add('evaluation')
  if (JSON.stringify(level.frameRules ?? {}) !== JSON.stringify(solution.frameRules ?? level.frameRules ?? {})) changed.add('constraints')
  return changed
}

export function auditMission(level: GameLevel, solution?: ReferenceSolution): readonly MissionAuditFinding[] {
  const findings: MissionAuditFinding[] = []
  if (!level.learningObjective?.trim()) findings.push({ severity: 'warning', check: 'Learning objective', detail: 'Add a learner-facing objective.' })
  else findings.push({ severity: 'pass', check: 'Learning objective', detail: 'A learning objective is present.' })
  if (level.instruction.trim().length < 18) findings.push({ severity: 'warning', check: 'Instruction', detail: 'The instruction may be too short to identify the required action.' })
  else findings.push({ severity: 'pass', check: 'Instruction', detail: 'The instruction describes a concrete task.' })

  const initial: ReferenceSolution = { worlds: level.worlds, edges: level.edges, evaluationWorld: level.evaluationWorld, frameRules: level.frameRules }
  try {
    assertValidReferenceSolution(level, initial)
    findings.push({ severity: 'error', check: 'Initial state', detail: 'The captured start already satisfies the mission.' })
  } catch {
    findings.push({ severity: 'pass', check: 'Initial state', detail: 'The captured start does not already pass.' })
  }

  if (!solution) {
    findings.push({ severity: 'error', check: 'Reference solution', detail: 'Capture a passing reference solution before export.' })
  } else {
    try {
      assertValidReferenceSolution(level, solution)
      findings.push({ severity: 'pass', check: 'Reference solution', detail: 'The reference construction passes all checks.' })
      const changes = changedAreas(level, solution)
      const locked = [...changes].filter((area) => !level.editable.includes(area))
      findings.push(locked.length
        ? { severity: 'error', check: 'Editable controls', detail: `The solution changes locked area(s): ${locked.join(', ')}.` }
        : { severity: 'pass', check: 'Editable controls', detail: 'Every demonstrated solution change is available to the player.' })
      if (changes.size <= 1) findings.push({ severity: 'warning', check: 'Triviality', detail: 'The reference differs in only one edit category; playtest for an accidental one-click solution.' })
    } catch (error) {
      findings.push({ severity: 'error', check: 'Reference solution', detail: error instanceof Error ? error.message : 'The reference solution is invalid.' })
    }
  }

  try {
    const atomCount = collectAtoms(parseFormula(level.formula ?? '')).length
    const valuationCount = 2 ** (level.worlds.length * atomCount)
    if ((level.scope === 'frame' || level.scope === 'correspondence') && valuationCount > 65_536) findings.push({ severity: 'error', check: 'Frame cost', detail: `${valuationCount.toLocaleString('en-US')} valuations exceed the runtime limit.` })
    else findings.push({ severity: 'pass', check: 'Frame cost', detail: `${valuationCount.toLocaleString('en-US')} valuation(s) at the captured start.` })
  } catch (error) {
    findings.push({ severity: 'error', check: 'Formula', detail: error instanceof Error ? error.message : 'The formula cannot be parsed.' })
  }

  if (!level.prediction) findings.push({ severity: 'warning', check: 'Prediction', detail: 'Consider capturing the learner’s initial mental model before verification.' })
  else if (level.prediction.prompt.trim() === level.instruction.trim()) findings.push({ severity: 'warning', check: 'Prediction', detail: 'Use a prediction prompt distinct from the construction instruction.' })
  else findings.push({ severity: 'pass', check: 'Prediction', detail: 'A separate prediction interaction is configured.' })
  return findings
}
