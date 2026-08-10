export interface EditableModelWorld {
  readonly id: string
}

export interface EditableModelEdge {
  readonly from: string
  readonly to: string
}

export type ModelIntegrityIssue =
  | { readonly kind: 'empty-world-id'; readonly worldIndex: number }
  | { readonly kind: 'duplicate-world-id'; readonly worldIndex: number; readonly worldId: string }
  | { readonly kind: 'missing-edge-source'; readonly edgeIndex: number; readonly worldId: string }
  | { readonly kind: 'missing-edge-target'; readonly edgeIndex: number; readonly worldId: string }
  | { readonly kind: 'duplicate-edge'; readonly edgeIndex: number; readonly from: string; readonly to: string }

export const edgePairKey = (from: string, to: string) => `${from}\u0000${to}`

export function validateWorldIdCandidate(
  worlds: readonly EditableModelWorld[],
  currentIndex: number,
  candidate: string,
): string | null {
  const worldId = candidate.trim()
  if (!worldId) return 'World name cannot be empty.'
  if (worlds.some((world, index) => index !== currentIndex && world.id.trim() === worldId)) return `A world named ${worldId} already exists.`
  return null
}

export function hasExplicitEdge(
  edges: readonly EditableModelEdge[],
  from: string,
  to: string,
  exceptIndex = -1,
): boolean {
  return edges.some((edge, index) => index !== exceptIndex && edge.from === from && edge.to === to)
}

export function validateExplicitEdgeCandidate(
  worlds: readonly EditableModelWorld[],
  edges: readonly EditableModelEdge[],
  from: string,
  to: string,
  exceptIndex = -1,
): string | null {
  const worldIds = new Set(worlds.map((world) => world.id.trim()))
  if (!worldIds.has(from)) return 'Choose an existing source world.'
  if (!worldIds.has(to)) return 'Choose an existing destination world.'
  if (hasExplicitEdge(edges, from, to, exceptIndex)) return 'This explicit relation already exists.'
  return null
}

export function validateEditableModel(
  worlds: readonly EditableModelWorld[],
  edges: readonly EditableModelEdge[],
): readonly ModelIntegrityIssue[] {
  const issues: ModelIntegrityIssue[] = []
  const worldIds = new Set<string>()
  worlds.forEach((world, worldIndex) => {
    const worldId = world.id.trim()
    if (!worldId) issues.push({ kind: 'empty-world-id', worldIndex })
    else if (worldIds.has(worldId)) issues.push({ kind: 'duplicate-world-id', worldIndex, worldId })
    else worldIds.add(worldId)
  })
  const pairs = new Set<string>()
  edges.forEach((edge, edgeIndex) => {
    if (!worldIds.has(edge.from)) issues.push({ kind: 'missing-edge-source', edgeIndex, worldId: edge.from })
    if (!worldIds.has(edge.to)) issues.push({ kind: 'missing-edge-target', edgeIndex, worldId: edge.to })
    const pair = edgePairKey(edge.from, edge.to)
    if (pairs.has(pair)) issues.push({ kind: 'duplicate-edge', edgeIndex, from: edge.from, to: edge.to })
    else pairs.add(pair)
  })
  return issues
}

export function deleteWorldFromEditableModel<World extends EditableModelWorld & { readonly key: number }, Edge extends EditableModelEdge>(
  worlds: readonly World[],
  edges: readonly Edge[],
  worldKey: number,
  evaluationWorld: string,
): { readonly worlds: readonly World[]; readonly edges: readonly Edge[]; readonly evaluationWorld: string; readonly removedWorldId: string; readonly incidentRelationCount: number } | null {
  const removedIndex = worlds.findIndex((world) => world.key === worldKey)
  if (removedIndex < 0) return null
  const removedWorldId = worlds[removedIndex].id.trim()
  const remainingWorlds = worlds.filter((world) => world.key !== worldKey)
  const remainingEdges = edges.filter(({ from, to }) => from !== removedWorldId && to !== removedWorldId)
  const incidentRelationCount = edges.length - remainingEdges.length
  return {
    worlds: remainingWorlds,
    edges: remainingEdges,
    evaluationWorld: evaluationWorld === removedWorldId ? remainingWorlds[Math.min(removedIndex, remainingWorlds.length - 1)]?.id.trim() ?? '' : evaluationWorld,
    removedWorldId,
    incidentRelationCount,
  }
}
