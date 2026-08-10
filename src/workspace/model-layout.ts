import { WORLD_NODE_SIZE } from './world-placement'

export interface LayoutWorld {
  readonly key: number
  readonly id: string
  readonly position: { readonly x: number; readonly y: number }
}

export interface LayoutEdge { readonly from: string; readonly to: string }
export type ModelLayout = ReadonlyMap<number, { readonly x: number; readonly y: number }>

interface GraphLinks {
  readonly outgoing: Set<number>
  readonly incoming: Set<number>
  readonly adjacent: Set<number>
}

interface LayoutBlock {
  readonly positions: ReadonlyMap<number, { readonly x: number; readonly y: number }>
  readonly width: number
  readonly height: number
}

const NODE_GAP = 44
const MINIMUM_DISTANCE = WORLD_NODE_SIZE + NODE_GAP
const COMPONENT_GAP = 100
const CANVAS_ORIGIN = 80
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const stableWorldOrder = (left: LayoutWorld, right: LayoutWorld) => left.key - right.key || left.id.localeCompare(right.id)

const normalizeBlock = (positions: ReadonlyMap<number, { readonly x: number; readonly y: number }>): LayoutBlock => {
  const values = [...positions.values()]
  if (values.length === 0) return { positions, width: 0, height: 0 }
  const minimumX = Math.min(...values.map(({ x }) => x))
  const minimumY = Math.min(...values.map(({ y }) => y))
  const maximumX = Math.max(...values.map(({ x }) => x))
  const maximumY = Math.max(...values.map(({ y }) => y))
  return {
    positions: new Map([...positions].map(([key, position]) => [key, { x: position.x - minimumX, y: position.y - minimumY }])),
    width: maximumX - minimumX + WORLD_NODE_SIZE,
    height: maximumY - minimumY + WORLD_NODE_SIZE,
  }
}

const localComponentLayout = (
  component: readonly LayoutWorld[],
  links: ReadonlyMap<number, GraphLinks>,
  evaluationWorld: string,
): LayoutBlock => {
  if (component.length === 1) return normalizeBlock(new Map([[component[0].key, { x: 0, y: 0 }]]))
  if (component.length === 2) {
    const evaluation = component.find((world) => world.id.trim() === evaluationWorld.trim())
    const ordered = evaluation ? [evaluation, component.find((world) => world !== evaluation)!] : component
    return normalizeBlock(new Map([
      [ordered[0].key, { x: 0, y: 0 }],
      [ordered[1].key, { x: MINIMUM_DISTANCE, y: 0 }],
    ]))
  }

  const byKey = new Map(component.map((world) => [world.key, world]))
  const evaluation = component.find((world) => world.id.trim() === evaluationWorld.trim())
  const root = evaluation ?? [...component].sort((left, right) => {
    const degreeDifference = (links.get(right.key)?.adjacent.size ?? 0) - (links.get(left.key)?.adjacent.size ?? 0)
    return degreeDifference || stableWorldOrder(left, right)
  })[0]
  const visited = new Set([root.key])
  const queue: Array<{ key: number; layer: number }> = [{ key: root.key, layer: 0 }]
  const layers = new Map<number, LayoutWorld[]>([[0, [root]]])

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLinks = links.get(current.key)
    const neighbours = [...(currentLinks?.adjacent ?? [])]
      .map((key) => byKey.get(key))
      .filter((world): world is LayoutWorld => Boolean(world))
      .sort((left, right) => {
        const outgoingDifference = Number(currentLinks?.outgoing.has(right.key)) - Number(currentLinks?.outgoing.has(left.key))
        return outgoingDifference || stableWorldOrder(left, right)
      })
    for (const neighbour of neighbours) {
      if (visited.has(neighbour.key)) continue
      visited.add(neighbour.key)
      const layer = current.layer + 1
      layers.set(layer, [...(layers.get(layer) ?? []), neighbour])
      queue.push({ key: neighbour.key, layer })
    }
  }

  const positions = new Map<number, { x: number; y: number }>([[root.key, { x: 0, y: 0 }]])
  for (const [layerIndex, layerWorlds] of [...layers].filter(([layer]) => layer > 0).sort(([left], [right]) => left - right)) {
    const count = layerWorlds.length
    let radius = Math.max(MINIMUM_DISTANCE * Math.sqrt(layerIndex), count * MINIMUM_DISTANCE / (2 * Math.PI))
    const rotation = layerIndex * GOLDEN_ANGLE
    let candidates: Array<{ x: number; y: number }> = []
    for (let attempt = 0; attempt < 40; attempt += 1) {
      candidates = layerWorlds.map((_, index) => {
        const angle = rotation + index / count * Math.PI * 2
        return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) }
      })
      const occupied = [...positions.values()]
      const collides = candidates.some((candidate, index) => [
        ...occupied,
        ...candidates.slice(0, index),
      ].some((other) => Math.abs(candidate.x - other.x) < MINIMUM_DISTANCE && Math.abs(candidate.y - other.y) < MINIMUM_DISTANCE))
      if (!collides) break
      radius += 18
    }
    layerWorlds.forEach((world, index) => positions.set(world.key, candidates[index]))
  }
  return normalizeBlock(positions)
}

const isolatedWorldBlock = (worlds: readonly LayoutWorld[], evaluationWorld: string): LayoutBlock => {
  const ordered = [...worlds].sort((left, right) => {
    const evaluationDifference = Number(right.id.trim() === evaluationWorld.trim()) - Number(left.id.trim() === evaluationWorld.trim())
    return evaluationDifference || stableWorldOrder(left, right)
  })
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length)))
  return normalizeBlock(new Map(ordered.map((world, index) => [world.key, {
    x: index % columns * MINIMUM_DISTANCE,
    y: Math.floor(index / columns) * MINIMUM_DISTANCE,
  }])))
}

export function createTidyModelLayout(
  worlds: readonly LayoutWorld[],
  edges: readonly LayoutEdge[],
  evaluationWorld: string,
): ModelLayout {
  const stableWorlds = [...worlds].sort(stableWorldOrder)
  const byId = new Map<string, LayoutWorld>()
  for (const world of stableWorlds) {
    const id = world.id.trim()
    if (id && !byId.has(id)) byId.set(id, world)
  }
  const links = new Map(stableWorlds.map((world) => [world.key, {
    outgoing: new Set<number>(), incoming: new Set<number>(), adjacent: new Set<number>(),
  }]))
  for (const edge of edges) {
    const source = byId.get(edge.from.trim())
    const target = byId.get(edge.to.trim())
    if (!source || !target || source.key === target.key) continue
    links.get(source.key)?.outgoing.add(target.key)
    links.get(target.key)?.incoming.add(source.key)
    links.get(source.key)?.adjacent.add(target.key)
    links.get(target.key)?.adjacent.add(source.key)
  }

  const isolatedWorlds = stableWorlds.filter((world) => links.get(world.key)?.adjacent.size === 0)
  const connectedWorlds = stableWorlds.filter((world) => (links.get(world.key)?.adjacent.size ?? 0) > 0)
  const worldByKey = new Map(stableWorlds.map((world) => [world.key, world]))
  const visited = new Set<number>()
  const components: LayoutWorld[][] = []
  for (const world of connectedWorlds) {
    if (visited.has(world.key)) continue
    const component: LayoutWorld[] = []
    const queue = [world.key]
    visited.add(world.key)
    while (queue.length > 0) {
      const key = queue.shift()!
      const member = worldByKey.get(key)
      if (member) component.push(member)
      for (const neighbour of links.get(key)?.adjacent ?? []) {
        if (visited.has(neighbour)) continue
        visited.add(neighbour)
        queue.push(neighbour)
      }
    }
    components.push(component.sort(stableWorldOrder))
  }
  components.sort((left, right) => {
    const leftEvaluation = left.some((world) => world.id.trim() === evaluationWorld.trim())
    const rightEvaluation = right.some((world) => world.id.trim() === evaluationWorld.trim())
    return Number(rightEvaluation) - Number(leftEvaluation) || stableWorldOrder(left[0], right[0])
  })

  const componentBlocks = components.map((component) => localComponentLayout(component, links, evaluationWorld))
  const isolateBlock = isolatedWorlds.length > 0 ? isolatedWorldBlock(isolatedWorlds, evaluationWorld) : null
  const evaluationIsIsolated = isolatedWorlds.some((world) => world.id.trim() === evaluationWorld.trim())
  const blocks = isolateBlock && evaluationIsIsolated
    ? [isolateBlock, ...componentBlocks]
    : [...componentBlocks, ...(isolateBlock ? [isolateBlock] : [])]
  const totalArea = blocks.reduce((area, block) => area + (block.width + COMPONENT_GAP) * (block.height + COMPONENT_GAP), 0)
  const targetRowWidth = Math.max(520, Math.sqrt(totalArea) * 1.35)
  const layout = new Map<number, { x: number; y: number }>()
  let cursorX = CANVAS_ORIGIN
  let cursorY = CANVAS_ORIGIN
  let rowHeight = 0
  for (const block of blocks) {
    if (cursorX > CANVAS_ORIGIN && cursorX + block.width > CANVAS_ORIGIN + targetRowWidth) {
      cursorX = CANVAS_ORIGIN
      cursorY += rowHeight + COMPONENT_GAP
      rowHeight = 0
    }
    for (const [key, position] of block.positions) {
      layout.set(key, { x: Math.round(cursorX + position.x), y: Math.round(cursorY + position.y) })
    }
    cursorX += block.width + COMPONENT_GAP
    rowHeight = Math.max(rowHeight, block.height)
  }
  return layout
}
