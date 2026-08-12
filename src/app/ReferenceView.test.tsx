// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReferenceView } from './ReferenceView'
afterEach(cleanup)
describe('ReferenceView', () => {
  it('contains mathematical reference without application-control instructions', async () => {
    render(<ReferenceView onOpenLearn={vi.fn()} onOpenLab={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Modal Logic Reference' })).toBeVisible()
    expect(screen.getByText(/M =/)).toBeVisible()
    expect(screen.queryByText(/Drag empty space/)).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Semantic scopes' }))
    expect(screen.getByText(/F ⊨ φ/)).toBeVisible()
    screen.getByRole('tab', { name: 'Semantic scopes' }).focus()
    await userEvent.setup().keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Relations & axioms' })).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Frame properties' })).toBeVisible()
  })
})
