export interface LayoutWorld {
  readonly key: number
  readonly id: string
  readonly position: { readonly x: number; readonly y: number }
}

export interface LayoutEdge { readonly from: string; readonly to: string }
export type ModelLayout = ReadonlyMap<number, { readonly x: number; readonly y: number }>

const HORIZONTAL_SPACING = 210
const VERTICAL_SPACING = 145
const COMPONENT_GAP = 170

export function createTidyModelLayout(
  worlds: readonly LayoutWorld[],
  edges: readonly LayoutEdge[],
  evaluationWorld: string,
): ModelLayout {
  const stableWorlds = [...worlds].sort((left, right) => left.key - right.key || left.id.localeCompare(right.id))
  const byId = new Map(stableWorlds.map((world) => [world.id.trim(), world]))
  const adjacency = new Map(stableWorlds.map((world) => [world.id.trim(), new Set<string>()]))
  for (const edge of edges) {
    if (edge.from === edge.to || !byId.has(edge.from) || !byId.has(edge.to)) continue
    adjacency.get(edge.from)?.add(edge.to)
    adjacency.get(edge.to)?.add(edge.from)
  }
  const first = byId.get(evaluationWorld)
  const roots = first ? [first, ...stableWorlds.filter((world) => world !== first)] : stableWorlds
  const visited = new Set<string>()
  const positions = new Map<number, { x: number; y: number }>()
  let componentX = 80

  for (const root of roots) {
    const rootId = root.id.trim()
    if (visited.has(rootId)) continue
    const queue: Array<{ id: string; layer: number }> = [{ id: rootId, layer: 0 }]
    const layers = new Map<number, LayoutWorld[]>()
    visited.add(rootId)
    while (queue.length > 0) {
      const current = queue.shift()!
      const world = byId.get(current.id)
      if (!world) continue
      layers.set(current.layer, [...(layers.get(current.layer) ?? []), world])
      const neighbours = [...(adjacency.get(current.id) ?? [])]
        .map((id) => byId.get(id))
        .filter((candidate): candidate is LayoutWorld => Boolean(candidate))
        .sort((left, right) => left.key - right.key || left.id.localeCompare(right.id))
      for (const neighbour of neighbours) {
        const id = neighbour.id.trim()
        if (visited.has(id)) continue
        visited.add(id)
        queue.push({ id, layer: current.layer + 1 })
      }
    }
    const maximumRows = Math.max(1, ...[...layers.values()].map((layer) => layer.length))
    for (const [layerIndex, layerWorlds] of [...layers.entries()].sort(([left], [right]) => left - right)) {
      layerWorlds.forEach((world, rowIndex) => {
        const centeredRow = rowIndex + (maximumRows - layerWorlds.length) / 2
        positions.set(world.key, { x: componentX + layerIndex * HORIZONTAL_SPACING, y: 80 + centeredRow * VERTICAL_SPACING })
      })
    }
    componentX += Math.max(1, layers.size) * HORIZONTAL_SPACING + COMPONENT_GAP
  }
  return positions
}
