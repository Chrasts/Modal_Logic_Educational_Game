// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StaticKripkeDiagram } from './StaticKripkeDiagram'

describe('StaticKripkeDiagram', () => {
  it('renders accessible worlds, directed edges and a self-loop', () => {
    const { container } = render(<StaticKripkeDiagram worlds={[{ id: 'w0', atoms: 'p' }, { id: 'w1', atoms: '' }]} edges={[{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }]} evaluationWorld="w0" ariaLabel="Example model" />)
    expect(screen.getByRole('img', { name: 'Example model' })).toBeInTheDocument()
    expect(screen.getByText(/w0 with p/)).toBeInTheDocument()
    expect(container.querySelectorAll('.static-edge')).toHaveLength(2)
    expect(container.querySelector('.static-edge.self')).toBeInTheDocument()
  })
})
