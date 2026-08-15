// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildSemanticHighlight, createModel, parseFormula } from '../logic'
import { EvaluationExplorer } from './EvaluationExplorer'

describe('EvaluationExplorer', () => {
  it('exposes every occurrence as a keyboard-selectable tree item', async () => {
    const formula = parseFormula('p ∧ p')
    const onSelect = vi.fn()
    render(<EvaluationExplorer open formula={formula} selectedPath="root" highlight={buildSemanticHighlight(createModel({ w0: ['p'] }), formula, 'w0')} onToggle={() => undefined} onSelect={onSelect} />)
    const occurrences = screen.getAllByRole('treeitem', { name: /^p$/u })
    expect(occurrences).toHaveLength(2)
    occurrences[1].focus()
    await userEvent.setup().keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('right')
  })

  it('shows an explicit empty state when no valid formula is available', () => {
    render(<EvaluationExplorer open selectedPath="root" onToggle={() => undefined} onSelect={() => undefined} />)
    expect(screen.getByText(/Enter a valid formula/)).toBeVisible()
  })
})
