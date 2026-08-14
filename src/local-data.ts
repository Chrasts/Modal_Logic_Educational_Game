import { migrateLearnProgress, type LearnProgress } from './learn-progress'

export const progressBackupFormat = 'logic-model-builder-progress-backup'

export interface ProgressBackupV2 {
  readonly format: typeof progressBackupFormat
  readonly version: 2
  readonly contentRevision: number
  readonly guest: unknown
  readonly completedLevelIds: readonly string[]
  readonly learnProgress: LearnProgress
  readonly referenceSolutionViewed: readonly string[]
  readonly sandbox?: unknown
}

export interface LegacyProfileBackup {
  readonly format: 'logic-model-builder-profile'
  readonly version: 1
  readonly contentRevision?: number
  readonly guest: unknown
  readonly completedLevelIds: readonly string[]
}

const asRecord = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message)
  return value as Record<string, unknown>
}

const strings = (value: unknown): readonly string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export function serializeProgressBackup(input: Omit<ProgressBackupV2, 'format' | 'version'>): string {
  return JSON.stringify({ format: progressBackupFormat, version: 2, ...input }, null, 2)
}

export function parseProgressBackup(source: string | unknown): ProgressBackupV2 | LegacyProfileBackup {
  const raw = typeof source === 'string' ? JSON.parse(source) : source
  const value = asRecord(raw, 'The backup must be a JSON object.')
  if (value.format === 'logic-model-builder-profile' && value.version === 1) {
    asRecord(value.guest, 'The legacy backup has no valid guest profile.')
    return {
      format: 'logic-model-builder-profile', version: 1,
      contentRevision: typeof value.contentRevision === 'number' ? value.contentRevision : undefined,
      guest: value.guest,
      completedLevelIds: strings(value.completedLevelIds),
    }
  }
  if (value.format !== progressBackupFormat || value.version !== 2) throw new Error('Unsupported progress backup format or version.')
  asRecord(value.guest, 'The progress backup has no valid guest profile.')
  const rawLearn = asRecord(value.learnProgress, 'The progress backup has no valid Learn progress.')
  if (rawLearn.version !== 1) throw new Error('Unsupported Learn progress version.')
  return {
    format: progressBackupFormat, version: 2,
    contentRevision: typeof value.contentRevision === 'number' ? value.contentRevision : 1,
    guest: value.guest,
    completedLevelIds: strings(value.completedLevelIds),
    learnProgress: migrateLearnProgress(rawLearn),
    referenceSolutionViewed: strings(value.referenceSolutionViewed),
    sandbox: value.sandbox,
  }
}

export interface ParsedSandboxModel {
  readonly formula: string
  readonly comparisonFormula: string
  readonly scope: 'pointed' | 'model' | 'frame' | 'correspondence'
  readonly targetTruth: boolean
  readonly evaluationWorld: string
  readonly correspondencePreset: string
  readonly worlds: readonly { readonly id: string; readonly atoms: string; readonly position: { readonly x: number; readonly y: number } }[]
  readonly edges: readonly { readonly from: string; readonly to: string }[]
  readonly frameRules: Readonly<Record<string, 'off' | 'validate' | 'enforce'>>
}

export function parseSandboxModel(source: string | unknown): ParsedSandboxModel {
  const raw = typeof source === 'string' ? JSON.parse(source) : source
  const value = asRecord(raw, 'The model must be a JSON object.')
  if (value.format !== 'logic-model-builder' || value.version !== 1) throw new Error('Unsupported model format or version.')
  if (typeof value.formula !== 'string') throw new Error('The imported formula is missing.')
  if (!Array.isArray(value.worlds) || value.worlds.length === 0) throw new Error('The imported model must contain at least one world.')
  const worlds = value.worlds.map((item, index) => {
    const world = asRecord(item, 'Invalid world data.')
    if (typeof world.id !== 'string' || !world.id.trim() || typeof world.atoms !== 'string') throw new Error('Every imported world needs a name and atom list.')
    if (world.atoms.split(/[\s,]+/u).filter(Boolean).some((atom) => !/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom))) throw new Error(`Invalid atom list at ${world.id}.`)
    const position = world.position && typeof world.position === 'object' ? world.position as Record<string, unknown> : {}
    return { id: world.id.trim(), atoms: world.atoms, position: { x: typeof position.x === 'number' ? position.x : 90 + (index % 3) * 240, y: typeof position.y === 'number' ? position.y : 90 + Math.floor(index / 3) * 150 } }
  })
  const ids = worlds.map(({ id }) => id)
  if (new Set(ids).size !== ids.length) throw new Error('Imported world names must be unique.')
  if (!Array.isArray(value.edges)) throw new Error('Invalid relation data.')
  const edges = value.edges.map((item) => {
    const edge = asRecord(item, 'Invalid relation data.')
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string' || !ids.includes(edge.from) || !ids.includes(edge.to)) throw new Error('An imported relation references an unknown world.')
    return { from: edge.from, to: edge.to }
  })
  const rawRules = value.frameRules && typeof value.frameRules === 'object' ? value.frameRules as Record<string, unknown> : {}
  const ruleNames = ['reflexive', 'symmetric', 'transitive', 'euclidean', 'serial', 'irreflexive', 'acyclic']
  const frameRules = Object.fromEntries(ruleNames.map((property) => {
    const mode = rawRules[property]
    const canEnforce = ['reflexive', 'symmetric', 'transitive', 'euclidean'].includes(property)
    return [property, mode === 'validate' || (mode === 'enforce' && canEnforce) ? mode : 'off']
  })) as ParsedSandboxModel['frameRules']
  const scope = ['pointed', 'model', 'frame', 'correspondence'].includes(String(value.scope)) ? value.scope as ParsedSandboxModel['scope'] : 'pointed'
  return { formula: value.formula, comparisonFormula: typeof value.comparisonFormula === 'string' ? value.comparisonFormula.trim() : '', scope, targetTruth: typeof value.targetTruth === 'boolean' ? value.targetTruth : true, evaluationWorld: typeof value.evaluationWorld === 'string' && ids.includes(value.evaluationWorld) ? value.evaluationWorld : ids[0], correspondencePreset: typeof value.correspondencePreset === 'string' ? value.correspondencePreset : '', worlds, edges, frameRules }
}
