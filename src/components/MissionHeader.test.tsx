// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionHeader } from './MissionHeader'

afterEach(cleanup)

describe('MissionHeader', () => {
  it('groups navigation, primary action, and the closed details disclosure compactly', () => {
    render(<MissionHeader mode="learn" sectionTitle="Truth at a World" itemTitle="Atomic truth" progressLabel="Lesson 1 of 3" objective="Make p true at w0." actions={<><button type="button">Previous lesson</button><button type="button" className="verify-button">Check task</button><button type="button">Next lesson</button></>} details={<p>One concise hint.</p>} />)
    const controls = screen.getByRole('button', { name: 'Check task' }).closest<HTMLElement>('.mission-header-controls')!
    expect(within(controls).getByRole('button', { name: 'Previous lesson' })).toBeVisible()
    expect(within(controls).getByRole('button', { name: 'Next lesson' })).toBeVisible()
    const disclosure = within(controls).getByText('Details & hints').closest('details')!
    expect(disclosure.open).toBe(false)
    expect(screen.queryByText('One concise hint.')).not.toBeVisible()
    fireEvent.click(within(controls).getByText('Details & hints'))
    expect(disclosure.open).toBe(true)
    expect(screen.getByText('One concise hint.')).toBeVisible()
  })

  it('keeps completion focus and rich content actions available', () => {
    const onNext = vi.fn()
    render(<MissionHeader mode="campaign" sectionTitle="Campaign" itemTitle="Mission" progressLabel="Mission 2 of 3" objective="Objective" state="completed" content={<p>Success explanation</p>} actions={<button type="button" onClick={onNext}>Next mission</button>} />)
    expect(screen.getByLabelText('Current mission')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Next mission' }))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
