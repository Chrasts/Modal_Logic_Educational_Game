import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

export interface ModalEdgeRouteInput {
  readonly sourceX: number
  readonly sourceY: number
  readonly targetX: number
  readonly targetY: number
  readonly selfLoop?: boolean
  readonly reversePair?: boolean
  readonly routeSign?: number
}

export interface ModalEdgeRoute {
  readonly kind: 'horizontal' | 'vertical' | 'reverse' | 'self-loop'
  readonly path: string
}

export const resolveModalEdgeEndpoints = (source: string | undefined, target: string | undefined) => source && target ? { source, target } : null

export function selectModalEdgeRoute({
  sourceX, sourceY, targetX, targetY, selfLoop = false, reversePair = false, routeSign = 1,
}: ModalEdgeRouteInput): ModalEdgeRoute {
  if (selfLoop) {
    const radius = 74
    return {
      kind: 'self-loop',
      path: `M ${sourceX},${sourceY} C ${sourceX + radius},${sourceY - radius * 1.35} ${sourceX - radius},${sourceY - radius * 1.35} ${targetX},${targetY}`,
    }
  }
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  if (reversePair) {
    const offset = 42 * Math.sign(routeSign || 1)
    const length = Math.max(1, Math.hypot(dx, dy))
    const normalX = -dy / length * offset
    const normalY = dx / length * offset
    return {
      kind: 'reverse',
      path: `M ${sourceX},${sourceY} C ${sourceX + dx * .32 + normalX},${sourceY + dy * .32 + normalY} ${sourceX + dx * .68 + normalX},${sourceY + dy * .68 + normalY} ${targetX},${targetY}`,
    }
  }
  if (Math.abs(dx) < Math.max(70, Math.abs(dy) * .55)) {
    const offset = 58 * Math.sign(routeSign || 1)
    return {
      kind: 'vertical',
      path: `M ${sourceX},${sourceY} C ${sourceX + offset},${sourceY + dy * .3} ${targetX + offset},${sourceY + dy * .7} ${targetX},${targetY}`,
    }
  }
  return { kind: 'horizontal', path: getBezierPath({ sourceX, sourceY, targetX, targetY })[0] }
}

type ModalEdgeData = {
  readonly selfLoop?: boolean
  readonly reversePair?: boolean
  readonly routeSign?: number
  readonly description?: string
}

export function ModalEdge(props: EdgeProps) {
  const data = (props.data ?? {}) as ModalEdgeData
  const route = selectModalEdgeRoute({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    selfLoop: data.selfLoop,
    reversePair: data.reversePair,
    routeSign: data.routeSign,
  })
  return <>
    {data.description && <title>{data.description}</title>}
    <BaseEdge id={props.id} path={route.path} markerStart={props.markerStart} markerEnd={props.markerEnd} style={props.style} interactionWidth={22} />
  </>
}

export const modalEdgeTypes = { modal: ModalEdge }
