export type WorldId = string

export interface KripkeWorld {
  readonly id: WorldId
  readonly valuation: ReadonlySet<string>
}

export interface AccessibilityEdge {
  readonly from: WorldId
  readonly to: WorldId
}

/** A finite Kripke model M = (W, R, ν). */
export interface KripkeModel {
  readonly worlds: ReadonlyMap<WorldId, KripkeWorld>
  readonly edges: readonly AccessibilityEdge[]
}

export function createModel(
  valuations: Readonly<Record<WorldId, readonly string[]>>,
  edges: readonly AccessibilityEdge[] = [],
): KripkeModel {
  if (Object.keys(valuations).length === 0) {
    throw new Error('A Kripke model must contain at least one world.')
  }
  const worlds = new Map<WorldId, KripkeWorld>()

  for (const [id, atoms] of Object.entries(valuations)) {
    if (!id.trim()) throw new Error('World id must not be empty.')
    if (id !== id.trim()) throw new Error(`World id „${id}“ must not contain surrounding whitespace.`)
    for (const atom of atoms) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(atom)) {
        throw new Error(`Invalid atom name: ${atom || '(empty)'}`)
      }
    }
    worlds.set(id, { id, valuation: new Set(atoms) })
  }

  const uniqueEdges = new Map<string, AccessibilityEdge>()
  for (const edge of edges) {
    if (!worlds.has(edge.from) || !worlds.has(edge.to)) {
      throw new Error(`Edge ${edge.from} → ${edge.to} references an unknown world.`)
    }
    uniqueEdges.set(`${edge.from}\u0000${edge.to}`, edge)
  }

  return { worlds, edges: [...uniqueEdges.values()] }
}

export function successors(model: KripkeModel, worldId: WorldId): readonly WorldId[] {
  if (!model.worlds.has(worldId)) throw new Error(`Unknown world: ${worldId}`)
  return model.edges.filter(({ from }) => from === worldId).map(({ to }) => to)
}
