import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ReactNode } from 'react'

export interface WorldNodeData extends Record<string, unknown> {
  readonly label: ReactNode
  readonly isEvaluation: boolean
}

export type WorldFlowNode = Node<WorldNodeData, 'world'>

const handles = [
  ['top', Position.Top],
  ['right', Position.Right],
  ['bottom', Position.Bottom],
  ['left', Position.Left],
] as const

export function WorldNode({ data, isConnectable }: NodeProps<WorldFlowNode>) {
  return <div className="world-node-content">
    {handles.map(([id, position]) => <Handle key={id} id={id} type="source" position={position} isConnectable={isConnectable}><i aria-hidden="true" /></Handle>)}
    {data.label}
  </div>
}

export const worldNodeTypes = { world: WorldNode }
