export interface DirectedRelation { readonly from: string; readonly to: string }

export interface RelationDirectionPresentation extends DirectedRelation {
  readonly explicitKey?: number
  readonly derived: boolean
}

export interface RelationPresentation {
  readonly kind: 'single' | 'bidirectional'
  readonly pairKey: string
  readonly source: string
  readonly target: string
  readonly forward: RelationDirectionPresentation
  readonly reverse?: RelationDirectionPresentation
}

export interface ReflexiveRelationPresentation {
  readonly worldId: string
  readonly explicitKey?: number
  readonly derived: boolean
}

const directionKey = (from: string, to: string) => `${from}\u0000${to}`
export const canonicalRelationPairKey = (left: string, right: string) => left <= right
  ? `${left}\u0001${right}`
  : `${right}\u0001${left}`

export function buildRelationPresentations(
  displayedEdges: readonly DirectedRelation[],
  explicitEdgeKeyByPair: ReadonlyMap<string, number>,
): readonly RelationPresentation[] {
  const unique = new Map(displayedEdges.map((edge) => [directionKey(edge.from, edge.to), edge]))
  const consumed = new Set<string>()
  const presentations: RelationPresentation[] = []
  for (const edge of [...unique.values()].sort((left, right) => directionKey(left.from, left.to).localeCompare(directionKey(right.from, right.to)))) {
    const edgeKey = directionKey(edge.from, edge.to)
    if (consumed.has(edgeKey)) continue
    consumed.add(edgeKey)
    if (edge.from === edge.to) continue
    const explicitKey = explicitEdgeKeyByPair.get(edgeKey)
    const direction: RelationDirectionPresentation = { ...edge, explicitKey, derived: explicitKey === undefined }
    const reverseEdgeKey = directionKey(edge.to, edge.from)
    const reverseEdge = unique.get(reverseEdgeKey)
    if (!reverseEdge) {
      presentations.push({ kind: 'single', pairKey: canonicalRelationPairKey(edge.from, edge.to), source: edge.from, target: edge.to, forward: direction })
      continue
    }
    consumed.add(reverseEdgeKey)
    const source = edge.from <= edge.to ? edge.from : edge.to
    const target = source === edge.from ? edge.to : edge.from
    const forwardEdge = unique.get(directionKey(source, target))!
    const reverse = unique.get(directionKey(target, source))!
    const forwardKey = explicitEdgeKeyByPair.get(directionKey(source, target))
    const reverseKey = explicitEdgeKeyByPair.get(directionKey(target, source))
    presentations.push({
      kind: 'bidirectional', pairKey: canonicalRelationPairKey(source, target), source, target,
      forward: { ...forwardEdge, explicitKey: forwardKey, derived: forwardKey === undefined },
      reverse: { ...reverse, explicitKey: reverseKey, derived: reverseKey === undefined },
    })
  }
  return presentations
}

export function buildReflexiveRelationPresentations(
  displayedEdges: readonly DirectedRelation[],
  explicitEdgeKeyByPair: ReadonlyMap<string, number>,
): ReadonlyMap<string, ReflexiveRelationPresentation> {
  const reflexive = new Map<string, ReflexiveRelationPresentation>()
  for (const edge of displayedEdges) {
    if (edge.from !== edge.to || reflexive.has(edge.from)) continue
    const explicitKey = explicitEdgeKeyByPair.get(directionKey(edge.from, edge.to))
    reflexive.set(edge.from, { worldId: edge.from, explicitKey, derived: explicitKey === undefined })
  }
  return reflexive
}

export function describeRelationPresentation(presentation: RelationPresentation): string {
  if (presentation.kind === 'single') return `Accessibility from ${presentation.source} to ${presentation.target}${presentation.forward.derived ? ', derived by an enforced frame rule' : ', explicit'}`
  const reverse = presentation.reverse!
  if (!presentation.forward.derived && !reverse.derived) return `Accessibility between ${presentation.source} and ${presentation.target} in both directions, both explicit`
  if (presentation.forward.derived && reverse.derived) return `Accessibility between ${presentation.source} and ${presentation.target} in both directions, both derived by enforced frame rules`
  return `${presentation.forward.from} to ${presentation.forward.to} ${presentation.forward.derived ? 'derived' : 'explicit'}; ${reverse.from} to ${reverse.to} ${reverse.derived ? 'derived' : 'explicit'}`
}
