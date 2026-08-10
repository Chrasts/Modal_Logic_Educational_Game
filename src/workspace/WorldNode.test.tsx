// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { WorldNode } from './WorldNode'

describe('WorldNode', () => {
  it('renders the semantic label and four equivalent connection handles', () => {
    const { container } = render(<ReactFlowProvider><WorldNode id="1" type="world" data={{ label: <span>World alpha, atoms p</span>, isEvaluation: true }} selected={false} selectable deletable dragging={false} draggable positionAbsoluteX={0} positionAbsoluteY={0} zIndex={0} isConnectable /></ReactFlowProvider>)
    expect(screen.getByText('World alpha, atoms p')).toBeInTheDocument()
    expect([...container.querySelectorAll('.react-flow__handle')].map((item) => item.getAttribute('data-handleid'))).toEqual(['top', 'right', 'bottom', 'left'])
  })
})
