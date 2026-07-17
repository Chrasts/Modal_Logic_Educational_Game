import type { AccessibilityEdge, WorldId } from './model'

export interface FrameProperties {
  readonly reflexive: boolean
  readonly symmetric: boolean
  readonly transitive: boolean
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
  }

  return [...relation.values()]
}

