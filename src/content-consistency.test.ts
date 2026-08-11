import { describe, expect, it } from 'vitest'
import { campaignTracks, tutorialLevels, validateLevelObjective, type GameLevel } from './campaign'
import { guidedCampaigns } from './guided-campaigns'
import { learnLessons } from './learn'
import { supportedPredictionKinds } from './components/PredictionInput'

const runtimeLevels: readonly GameLevel[] = [
  ...tutorialLevels,
  ...learnLessons.flatMap(({ task, transferTask }) => transferTask ? [task, transferTask] : [task]),
  ...campaignTracks.flatMap(({ levels }) => levels),
  ...guidedCampaigns.flatMap(({ levels }) => levels),
]
const pair = ({ from, to }: { readonly from: string; readonly to: string }) => `${from}\u0000${to}`
const atomPair = (world: string, atom: string) => `${world}\u0000${atom}`

describe('authored content consistency', () => {
  it('uses globally unique runtime IDs', () => {
    const ids = runtimeLevels.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(runtimeLevels)('$id has a coherent model and objective contract', (level) => {
    expect(() => validateLevelObjective(level)).not.toThrow()
    const worldIds = level.worlds.map(({ id }) => id)
    expect(worldIds.every((id) => id.trim().length > 0)).toBe(true)
    expect(new Set(worldIds).size).toBe(worldIds.length)
    expect(worldIds).toContain(level.evaluationWorld)

    const worldSet = new Set(worldIds)
    const explicit = level.edges.map(pair)
    expect(new Set(explicit).size).toBe(explicit.length)
    expect(level.edges.every(({ from, to }) => worldSet.has(from) && worldSet.has(to))).toBe(true)

    const required = new Set(level.constraints?.requiredEdges?.map(pair) ?? [])
    const forbidden = new Set(level.constraints?.forbiddenEdges?.map(pair) ?? [])
    expect([...required].every((relation) => !forbidden.has(relation))).toBe(true)
    expect([...(level.constraints?.requiredEdges ?? []), ...(level.constraints?.forbiddenEdges ?? [])].every(({ from, to }) => (worldSet.has(from) && worldSet.has(to)) || level.editable.includes('worlds'))).toBe(true)

    const requiredAtoms = new Set(Object.entries(level.constraints?.requiredAtoms ?? {}).flatMap(([world, atoms]) => atoms.map((atom) => atomPair(world, atom))))
    const forbiddenAtoms = new Set(Object.entries(level.constraints?.forbiddenAtoms ?? {}).flatMap(([world, atoms]) => atoms.map((atom) => atomPair(world, atom))))
    expect([...requiredAtoms].every((entry) => !forbiddenAtoms.has(entry))).toBe(true)
    expect([...Object.keys(level.constraints?.requiredAtoms ?? {}), ...Object.keys(level.constraints?.forbiddenAtoms ?? {})].every((world) => worldSet.has(world) || level.editable.includes('worlds'))).toBe(true)

    const requiredProperties = new Set(level.constraints?.requiredProperties ?? [])
    expect(level.constraints?.forbiddenProperties?.every((property) => !requiredProperties.has(property))).not.toBe(false)
    if (level.prediction) expect(supportedPredictionKinds[level.prediction.kind]).toBe(true)
  })

  it.each(runtimeLevels.filter(({ interactionMode }) => interactionMode !== 'question'))('$id exposes edits needed by unmet authored constraints', (level) => {
    const explicit = new Set(level.edges.map(pair))
    if (level.constraints?.requiredEdges?.some((relation) => !explicit.has(pair(relation)))) expect(level.editable).toContain('edges')
    if ((level.constraints?.minimumEdges ?? 0) > explicit.size) expect(level.editable).toContain('edges')
    if ((level.constraints?.minimumWorlds ?? 0) > level.worlds.length) expect(level.editable).toContain('worlds')
    for (const [world, atoms] of Object.entries(level.constraints?.requiredAtoms ?? {})) {
      const authored = level.worlds.find(({ id }) => id === world)?.atoms.split(/[\s,]+/u).filter(Boolean) ?? []
      if (atoms.some((atom) => !authored.includes(atom))) expect(level.editable.some((permission) => permission === 'valuations' || permission === 'worlds')).toBe(true)
    }
  })

  it('contains no legacy handle instructions or structural dummy tautologies', () => {
    const authoredCopy = runtimeLevels.flatMap((level) => [level.title, level.instruction, level.briefing, level.learningObjective, ...(level.taskSteps ?? []), ...(level.hints ?? [])]).filter(Boolean).join('\n')
    expect(authoredCopy).not.toMatch(/bottom\/source handle|top\/target handle|drag from bottom to top/iu)
    const structuralDummy = runtimeLevels.filter(({ objectiveKind, formula }) => objectiveKind === 'construction' && formula && /^(p\s*->\s*p|p\s*\|\s*!p|p\s*∨\s*¬p)$/u.test(formula))
    expect(structuralDummy.map(({ id }) => id)).toEqual([])
    expect(guidedCampaigns.find(({ id }) => id === 'frame-architect')?.levels.every(({ objectiveKind, formula }) => objectiveKind === 'construction' && formula === undefined)).toBe(true)
  })

  it('does not duplicate an exact authored mission signature', () => {
    const signatures = runtimeLevels.map((level) => JSON.stringify({ objectiveKind: level.objectiveKind ?? 'semantic', formula: level.formula, scope: level.scope, targetTruth: level.targetTruth, worlds: level.worlds.map(({ id, atoms }) => ({ id, atoms })), edges: level.edges, constraints: level.constraints, editable: level.editable }))
    expect(new Set(signatures).size).toBe(signatures.length)
  })
})
