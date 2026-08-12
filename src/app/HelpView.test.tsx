// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HelpView } from './HelpView'
afterEach(cleanup)
describe('HelpView', () => {
  it('contains application operation help rather than a duplicate mathematics course', async () => {
    render(<HelpView hasCurrentMission onReturnToMission={vi.fn()} onReplayWelcome={vi.fn()} onReplayControls={vi.fn()} onReplayTour={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Help & Controls' })).toBeVisible()
    expect(screen.getByText(/Drag empty space/)).toBeVisible()
    expect(screen.queryByText(/M =/)).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Results' }))
    expect(screen.getByText(/Expand Semantic details/)).toBeVisible()
    screen.getByRole('tab', { name: 'Results' }).focus()
    await userEvent.setup().keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Local data' })).toHaveFocus()
    expect(screen.getByRole('heading', { name: 'Local persistence' })).toBeVisible()
  })
})
