import { createModel, parseFormula, type AccessibilityEdge, type FramePropertyName, type ObjectiveScope } from './logic'

export const sandboxShareKind = 'sandbox-state'
export const sandboxShareVersion = 1
export type SandboxShareFrameRuleMode = 'off' | 'validate' | 'enforce'

export interface SandboxShareState {
  readonly worlds: readonly { readonly id: string; readonly atoms: readonly string[] }[]
  readonly edges: readonly AccessibilityEdge[]
  readonly evaluationWorld: string
  readonly formula: string
  readonly comparisonFormula: string
  readonly scope: ObjectiveScope
  readonly targetTruth: boolean
  readonly frameRules: Readonly<Record<FramePropertyName, SandboxShareFrameRuleMode>>
}

export interface SandboxSharePayload extends SandboxShareState {
  readonly kind: typeof sandboxShareKind
  readonly version: typeof sandboxShareVersion
}

const record = (value: unknown, message: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message)
  return value as Record<string, unknown>
}

const propertyNames: readonly FramePropertyName[] = ['reflexive', 'symmetric', 'transitive', 'euclidean', 'serial', 'irreflexive', 'acyclic']
const enforceable = new Set<FramePropertyName>(['reflexive', 'symmetric', 'transitive', 'euclidean'])

export const createSandboxSharePayload = (state: SandboxShareState): SandboxSharePayload => ({ kind: sandboxShareKind, version: sandboxShareVersion, ...state })

export function parseSandboxSharePayload(source: string | unknown): SandboxSharePayload {
  let raw: unknown
  try { raw = typeof source === 'string' ? JSON.parse(source) : source }
  catch { throw new Error('The shared Sandbox data is malformed.') }
  const value = record(raw, 'The shared Sandbox data must be an object.')
  if (value.kind !== sandboxShareKind || value.version !== sandboxShareVersion) throw new Error('Unsupported Sandbox share format or version.')
  if (!Array.isArray(value.worlds) || value.worlds.length === 0) throw new Error('The shared Sandbox needs at least one world.')
  const worlds = value.worlds.map((item) => {
    const world = record(item, 'Invalid shared world data.')
    if (typeof world.id !== 'string' || !world.id.trim() || world.id !== world.id.trim() || !Array.isArray(world.atoms) || world.atoms.some((atom) => typeof atom !== 'string')) throw new Error('Every shared world needs a valid name and valuation.')
    return { id: world.id, atoms: world.atoms as string[] }
  })
  if (new Set(worlds.map(({ id }) => id)).size !== worlds.length) throw new Error('Shared world names must be unique.')
  if (!Array.isArray(value.edges)) throw new Error('Invalid shared relation data.')
  const edges = value.edges.map((item) => {
    const edge = record(item, 'Invalid shared relation data.')
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string') throw new Error('Invalid shared relation data.')
    return { from: edge.from, to: edge.to }
  })
  createModel(Object.fromEntries(worlds.map(({ id, atoms }) => [id, atoms])), edges)
  const edgeKeys = edges.map(({ from, to }) => `${from}\u0000${to}`)
  if (new Set(edgeKeys).size !== edgeKeys.length) throw new Error('Shared explicit relations must be unique.')
  if (typeof value.evaluationWorld !== 'string' || !worlds.some(({ id }) => id === value.evaluationWorld)) throw new Error('The shared evaluation world does not exist.')
  if (typeof value.formula !== 'string' || !value.formula.trim()) throw new Error('The shared primary formula is missing.')
  parseFormula(value.formula)
  const comparisonFormula = typeof value.comparisonFormula === 'string' ? value.comparisonFormula : ''
  if (comparisonFormula.trim()) parseFormula(comparisonFormula)
  const scopes: readonly ObjectiveScope[] = ['pointed', 'model', 'frame', 'correspondence']
  if (!scopes.includes(value.scope as ObjectiveScope)) throw new Error('The shared semantic scope is unsupported.')
  const rawRules = record(value.frameRules, 'The shared frame rules are invalid.')
  const frameRules = Object.fromEntries(propertyNames.map((property) => {
    const mode = rawRules[property]
    if (mode !== 'off' && mode !== 'validate' && mode !== 'enforce') throw new Error(`The shared ${property} rule is invalid.`)
    if (mode === 'enforce' && !enforceable.has(property)) throw new Error(`The shared ${property} rule cannot be enforced.`)
    return [property, mode]
  })) as SandboxSharePayload['frameRules']
  return {
    kind: sandboxShareKind,
    version: sandboxShareVersion,
    worlds,
    edges,
    evaluationWorld: value.evaluationWorld,
    formula: value.formula,
    comparisonFormula,
    scope: value.scope as ObjectiveScope,
    targetTruth: typeof value.targetTruth === 'boolean' ? value.targetTruth : true,
    frameRules,
  }
}

export function isSandboxSharePayload(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && (value as Record<string, unknown>).kind === sandboxShareKind)
}
