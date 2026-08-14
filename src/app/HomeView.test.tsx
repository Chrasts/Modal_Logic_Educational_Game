// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeView } from './HomeView'

afterEach(cleanup)

describe('HomeView', () => {
  it('shows data-driven progress and delegates the primary routes', async () => {
    const onLearn = vi.fn()
    const user = userEvent.setup()
    const onLab = vi.fn()
    render(<HomeView completed={4} total={53} nextTitle="Necessity" onLearn={onLearn} onCampaigns={vi.fn()} onLab={onLab} />)
    expect(screen.getByText('4/53 complete')).toBeVisible()
    expect(screen.getByText('Next: Necessity')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Start or continue Learn Modal Logic' }))
    expect(onLearn).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Lab: experiment with models and formulas' }))
    expect(onLab).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /profile|settings|data/i })).not.toBeInTheDocument()
  })

  it('renders and resumes an active session', async () => {
    const onResume = vi.fn()
    render(<HomeView completed={0} total={10} currentSession={{ kind: 'lesson', title: 'Necessity', context: 'Learn' }} onResume={onResume} onLearn={vi.fn()} onCampaigns={vi.fn()} onLab={vi.fn()} />)
    expect(screen.getByText('Continue where you left off')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Resume lesson' }))
    expect(onResume).toHaveBeenCalledOnce()
  })
})
