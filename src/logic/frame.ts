import type { AccessibilityEdge, WorldId } from './model'

export interface FrameProperties {
  readonly reflexive: boolean
  readonly symmetric: boolean
  readonly transitive: boolean
  readonly euclidean?: boolean
}

export type FramePropertyName = 'reflexive' | 'symmetric' | 'transitive' | 'euclidean' | 'serial' | 'irreflexive' | 'acyclic'

export type FramePropertyWitness =
  | { readonly kind: 'missing-reflexive'; readonly world: WorldId }
  | { readonly kind: 'irreflexive-loop'; readonly world: WorldId }
  | { readonly kind: 'missing-successor'; readonly world: WorldId }
  | { readonly kind: 'missing-symmetric'; readonly edge: AccessibilityEdge; readonly missing: AccessibilityEdge }
  | { readonly kind: 'missing-transitive'; readonly first: AccessibilityEdge; readonly second: AccessibilityEdge; readonly missing: AccessibilityEdge }
  | { readonly kind: 'missing-euclidean'; readonly first: AccessibilityEdge; readonly second: AccessibilityEdge; readonly missing: AccessibilityEdge }
  | { readonly kind: 'cycle'; readonly worlds: readonly WorldId[] }

export interface FramePropertyResult {
  readonly property: FramePropertyName
  readonly holds: boolean
  readonly violations: readonly string[]
  readonly witnesses: readonly FramePropertyWitness[]
}

const edgeKey = (from: WorldId, to: WorldId) => `${from}\u0000${to}`

/** Returns the least relation containing the given edges with the selected frame properties. */
export function applyFrameProperties(
  worldIds: readonly WorldId[],
  edges: readonly AccessibilityEdge[],
  properties: FrameProperties,
): readonly AccessibilityEdge[] {
  const relation = new Map<string, AccessibilityEdge>()
  const add = (from: WorldId, to: WorldId) => relation.set(edgeKey(from, to), { from, to })

  edges.forEach(({ from, to }) => add(from, to))
  if (properties.reflexive) worldIds.forEach((world) => add(world, world))

  let changed = true
  while (changed) {
    changed = false
    const snapshot = [...relation.values()]

    if (properties.symmetric) {
      for (const { from, to } of snapshot) {
        const key = edgeKey(to, from)
        if (!relation.has(key)) {
          add(to, from)
          changed = true
        }
      }
    }

    if (properties.transitive) {
      const current = [...relation.values()]
      for (const first of current) {
        for (const second of current) {
          if (first.to !== second.from) continue
          const key = edgeKey(first.from, second.to)
          if (!relation.has(key)) {
            add(first.from, second.to)
            changed = true
          }
        }
      }
    }

    if (properties.euclidean) {
      const current = [...relation.values()]
      for (const first of current) {
        for (const second of current) {
          if (first.from !== second.from) continue
          const key = edgeKey(first.to, second.to)
          if (!relation.has(key)) {
            add(first.to, second.to)
            changed = true
          }
        }
      }
    }
  }

  return [...relation.values()]
}

export function checkFrameProperty(
  worldIds: readonly WorldId[],
  edges: readonly AccessibilityEdge[],
  property: FramePropertyName,
): FramePropertyResult {
  const relation = new Set(edges.map(({ from, to }) => edgeKey(from, to)))
  const has = (from: WorldId, to: WorldId) => relation.has(edgeKey(from, to))
  const violations: string[] = []
  const witnesses: FramePropertyWitness[] = []

  if (property === 'reflexive') {
    for (const world of worldIds) if (!has(world, world)) { violations.push(`${world} R ${world} is missing.`); witnesses.push({ kind: 'missing-reflexive', world }) }
  } else if (property === 'irreflexive') {
    for (const world of worldIds) if (has(world, world)) { violations.push(`${world} R ${world} violates irreflexivity.`); witnesses.push({ kind: 'irreflexive-loop', world }) }
  } else if (property === 'serial') {
    for (const world of worldIds) if (!worldIds.some((target) => has(world, target))) { violations.push(`${world} has no successor.`); witnesses.push({ kind: 'missing-successor', world }) }
  } else if (property === 'symmetric') {
    for (const edge of edges) if (!has(edge.to, edge.from)) { violations.push(`${edge.from} R ${edge.to}, but ${edge.to} R ${edge.from} is missing.`); witnesses.push({ kind: 'missing-symmetric', edge, missing: { from: edge.to, to: edge.from } }) }
  } else if (property === 'transitive') {
    for (const first of edges) for (const second of edges) {
      if (first.to === second.from && !has(first.from, second.to)) { violations.push(`${first.from} R ${first.to} and ${second.from} R ${second.to}, but ${first.from} R ${second.to} is missing.`); witnesses.push({ kind: 'missing-transitive', first, second, missing: { from: first.from, to: second.to } }) }
    }
  } else if (property === 'euclidean') {
    for (const first of edges) for (const second of edges) {
      if (first.from === second.from && !has(first.to, second.to)) { violations.push(`${first.from} R ${first.to} and ${first.from} R ${second.to}, but ${first.to} R ${second.to} is missing.`); witnesses.push({ kind: 'missing-euclidean', first, second, missing: { from: first.to, to: second.to } }) }
    }
  } else if (property === 'acyclic') {
    const visited = new Set<WorldId>()
    const path: WorldId[] = []
    let cycle: readonly WorldId[] | null = null
    const visit = (world: WorldId): void => {
      if (cycle || visited.has(world)) return
      const inPath = path.indexOf(world)
      if (inPath >= 0) { cycle = [...path.slice(inPath), world]; return }
      path.push(world)
      for (const target of worldIds) if (has(world, target)) visit(target)
      path.pop()
      visited.add(world)
    }
    for (const world of worldIds) visit(world)
    const foundCycle = cycle as readonly WorldId[] | null
    if (foundCycle) { violations.push(`The accessibility relation contains a directed cycle: ${foundCycle.join(' R ')}.`); witnesses.push({ kind: 'cycle', worlds: foundCycle }) }
  }

  const uniqueViolations = [...new Set(violations)]
  return { property, holds: uniqueViolations.length === 0, violations: uniqueViolations, witnesses }
}
