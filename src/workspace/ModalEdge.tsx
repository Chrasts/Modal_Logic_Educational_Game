import { BaseEdge, useInternalNode, type EdgeProps } from '@xyflow/react'
import { calculateFloatingEdgeGeometry, type RelationNodeRect } from './relation-routing'

export interface ModalEdgeRouteInput {
  readonly sourceX: number
  readonly sourceY: number
  readonly targetX: number
  readonly targetY: number
  readonly reversePair?: boolean
  readonly routeSign?: number
  readonly curveOffset?: number
}

export interface ModalEdgeRoute {
  readonly kind: 'direct' | 'curved' | 'reverse'
  readonly path: string
}

export const resolveModalEdgeEndpoints = (source: string | undefined, target: string | undefined) => source && target ? { source, target } : null

export function selectModalEdgeRoute({
  sourceX, sourceY, targetX, targetY, reversePair = false, routeSign = 1, curveOffset = 0,
}: ModalEdgeRouteInput): ModalEdgeRoute {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.max(1, Math.hypot(dx, dy))
  const signedOffset = (reversePair ? Math.max(34, Math.abs(curveOffset)) : curveOffset) * Math.sign(routeSign || 1)
  const normalX = -dy / length * signedOffset
  const normalY = dx / length * signedOffset
  return {
    kind: reversePair ? 'reverse' : signedOffset === 0 ? 'direct' : 'curved',
    path: `M ${sourceX},${sourceY} C ${sourceX + dx * .32 + normalX},${sourceY + dy * .32 + normalY} ${sourceX + dx * .68 + normalX},${sourceY + dy * .68 + normalY} ${targetX},${targetY}`,
  }
}

type ModalEdgeData = {
  readonly reversePair?: boolean
  readonly routeSign?: number
  readonly sourceOffset?: number
  readonly targetOffset?: number
  readonly curveOffset?: number
  readonly description?: string
}

const internalNodeRect = (node: ReturnType<typeof useInternalNode>): RelationNodeRect | null => {
  if (!node) return null
  const userNode = node.internals.userNode
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: node.measured.width ?? userNode.width ?? 96,
    height: node.measured.height ?? userNode.height ?? 96,
  }
}

export function ModalEdge(props: EdgeProps) {
  const data = (props.data ?? {}) as ModalEdgeData
  const sourceNode = useInternalNode(props.source)
  const targetNode = useInternalNode(props.target)
  const sourceRect = internalNodeRect(sourceNode)
  const targetRect = internalNodeRect(targetNode)
  const geometry = sourceRect && targetRect
    ? calculateFloatingEdgeGeometry(sourceRect, targetRect, data.sourceOffset, data.targetOffset)
    : { sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY }
  const route = selectModalEdgeRoute({
    ...geometry,
    reversePair: data.reversePair,
    routeSign: data.routeSign,
    curveOffset: data.curveOffset,
  })
  return <>
    {data.description && <title>{data.description}</title>}
    <BaseEdge id={props.id} path={route.path} markerStart={props.markerStart} markerEnd={props.markerEnd} style={props.style} interactionWidth={22} />
  </>
}

export const modalEdgeTypes = { modal: ModalEdge }
