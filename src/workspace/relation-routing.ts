import { WORLD_NODE_SIZE } from './world-placement'

export interface RelationRouteItem {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly kind: 'single' | 'reciprocal' | 'expanded'
}

export interface RelationRouteNode {
  readonly id: string
  readonly position: { readonly x: number; readonly y: number }
}

export interface RelationRouteLane {
  readonly sourceOffset: number
  readonly targetOffset: number
  readonly curveOffset: number
}

export interface RelationNodeRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface FloatingEdgeGeometry {
  readonly sourceX: number
  readonly sourceY: number
  readonly targetX: number
  readonly targetY: number
}

const ANGLE_BUCKET_SIZE = Math.PI / 12
const LANE_GAP = 16
export const SINGLE_ARROWHEAD_SIZE = 15
export const RECIPROCAL_ARROWHEAD_SIZE = 18

const alternatingOffsets = (count: number): readonly number[] => Array.from({ length: count }, (_, index) => {
  if (index === 0) return 0
  const magnitude = Math.ceil(index / 2) * LANE_GAP
  return index % 2 === 1 ? magnitude : -magnitude
})

const centredOffsets = (count: number): readonly number[] => Array.from(
  { length: count },
  (_, index) => (index - (count - 1) / 2) * LANE_GAP,
)

export function assignRelationRouteLanes(
  relations: readonly RelationRouteItem[],
  nodes: readonly RelationRouteNode[],
): ReadonlyMap<string, RelationRouteLane> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const endpoints = new Map<string, Array<{ id: string; endpoint: 'source' | 'target'; reciprocal: boolean }>>()
  const result = new Map(relations.map((relation) => [relation.id, { sourceOffset: 0, targetOffset: 0, curveOffset: 0 }]))

  const addEndpoint = (relation: RelationRouteItem, endpoint: 'source' | 'target') => {
    const own = nodeById.get(endpoint === 'source' ? relation.source : relation.target)
    const other = nodeById.get(endpoint === 'source' ? relation.target : relation.source)
    if (!own || !other) return
    const angle = Math.atan2(other.position.y - own.position.y, other.position.x - own.position.x)
    const bucket = Math.round(angle / ANGLE_BUCKET_SIZE)
    const key = `${own.id}\u0000${bucket}`
    endpoints.set(key, [...(endpoints.get(key) ?? []), { id: relation.id, endpoint, reciprocal: relation.kind === 'reciprocal' }])
  }

  for (const relation of relations) {
    if (relation.source === relation.target) continue
    addEndpoint(relation, 'source')
    addEndpoint(relation, 'target')
  }

  for (const group of endpoints.values()) {
    const ordered = [...group].sort((left, right) => Number(right.reciprocal) - Number(left.reciprocal) || left.id.localeCompare(right.id))
    const hasCentralReciprocal = ordered[0]?.reciprocal === true
    const offsets = hasCentralReciprocal ? alternatingOffsets(ordered.length) : centredOffsets(ordered.length)
    ordered.forEach((entry, index) => {
      const current = result.get(entry.id)
      if (!current) return
      result.set(entry.id, { ...current, [`${entry.endpoint}Offset`]: offsets[index] })
    })
  }

  for (const relation of relations) {
    const current = result.get(relation.id)
    if (!current) continue
    result.set(relation.id, {
      ...current,
      curveOffset: relation.kind === 'expanded' ? 34 : (current.sourceOffset + current.targetOffset) / 2,
    })
  }
  return result
}

const perimeterPoint = (
  rect: RelationNodeRect,
  directionX: number,
  directionY: number,
  tangentX: number,
  tangentY: number,
  offset: number,
) => {
  const radius = Math.max(8, Math.min(rect.width, rect.height) / 2 + 2)
  const safeOffset = Math.max(-radius * .72, Math.min(radius * .72, offset))
  const radial = Math.sqrt(Math.max(0, radius * radius - safeOffset * safeOffset))
  return {
    x: rect.x + rect.width / 2 + directionX * radial + tangentX * safeOffset,
    y: rect.y + rect.height / 2 + directionY * radial + tangentY * safeOffset,
  }
}

export function calculateFloatingEdgeGeometry(
  source: RelationNodeRect,
  target: RelationNodeRect,
  sourceOffset = 0,
  targetOffset = 0,
): FloatingEdgeGeometry {
  const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 }
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const directionX = dx / length
  const directionY = dy / length
  const tangentX = -directionY
  const tangentY = directionX
  const sourcePoint = perimeterPoint(source, directionX, directionY, tangentX, tangentY, sourceOffset)
  const targetPoint = perimeterPoint(target, -directionX, -directionY, tangentX, tangentY, targetOffset)
  return { sourceX: sourcePoint.x, sourceY: sourcePoint.y, targetX: targetPoint.x, targetY: targetPoint.y }
}

export const defaultRelationNodeRect = (x: number, y: number): RelationNodeRect => ({
  x, y, width: WORLD_NODE_SIZE, height: WORLD_NODE_SIZE,
})
