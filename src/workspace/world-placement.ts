export interface PositionedWorld {
  readonly key: number
  readonly position: { readonly x: number; readonly y: number }
}

export interface WorldPosition { readonly x: number; readonly y: number }

export const WORLD_NODE_SIZE = 96
export const WORLD_COLLISION_MARGIN = 22
const WORLD_SPAWN_STEP = WORLD_NODE_SIZE + WORLD_COLLISION_MARGIN + 18

export function resolveWorldVisualCenter(position: WorldPosition): WorldPosition {
  return { x: position.x + WORLD_NODE_SIZE / 2, y: position.y + WORLD_NODE_SIZE / 2 }
}

export function worldPositionsOverlap(left: WorldPosition, right: WorldPosition, margin = WORLD_COLLISION_MARGIN): boolean {
  return Math.abs(left.x - right.x) < WORLD_NODE_SIZE + margin
    && Math.abs(left.y - right.y) < WORLD_NODE_SIZE + margin
}

export function shouldCreateWorldFromPaneClick(input: { readonly detail: number; readonly canEditWorlds: boolean; readonly pointerType?: string }): boolean {
  return input.detail === 2 && input.canEditWorlds && input.pointerType !== 'touch'
}

export function findFreeWorldPosition(
  existingWorlds: readonly Pick<PositionedWorld, 'position'>[],
  preferredPosition: WorldPosition,
): WorldPosition {
  const occupied = (candidate: WorldPosition) => existingWorlds.some((world) => worldPositionsOverlap(world.position, candidate))
  if (!occupied(preferredPosition)) return { ...preferredPosition }
  for (let ring = 1; ring <= Math.max(8, existingWorlds.length + 2); ring += 1) {
    const radius = WORLD_SPAWN_STEP * ring
    const samples = ring * 8
    for (let index = 0; index < samples; index += 1) {
      const angle = index / samples * Math.PI * 2
      const candidate = {
        x: Math.round(preferredPosition.x + Math.cos(angle) * radius),
        y: Math.round(preferredPosition.y + Math.sin(angle) * radius),
      }
      if (!occupied(candidate)) return candidate
    }
  }
  return { x: preferredPosition.x + WORLD_SPAWN_STEP * (existingWorlds.length + 1), y: preferredPosition.y }
}

export function findOverlappingWorldKeys(worlds: readonly PositionedWorld[], movingKey: number, movingPosition: WorldPosition): ReadonlySet<number> {
  const overlapping = new Set<number>()
  for (const world of worlds) {
    if (world.key !== movingKey && worldPositionsOverlap(world.position, movingPosition, 0)) {
      overlapping.add(movingKey)
      overlapping.add(world.key)
    }
  }
  return overlapping
}

export function commitWorldPosition<T extends PositionedWorld>(worlds: readonly T[], movingKey: number, position: WorldPosition): readonly T[] {
  return worlds.map((world) => world.key === movingKey ? { ...world, position: { ...position } } : world)
}

export function applyCollisionClassNames<T extends { readonly id: string; readonly className?: string }>(
  nodes: readonly T[],
  collidingWorldKeys: ReadonlySet<number>,
): readonly T[] {
  return nodes.map((node) => {
    const classes = (node.className ?? '').split(/\s+/u).filter((name) => name && name !== 'colliding-world-node')
    if (collidingWorldKeys.has(Number(node.id))) classes.push('colliding-world-node')
    return { ...node, className: classes.join(' ') }
  })
}
