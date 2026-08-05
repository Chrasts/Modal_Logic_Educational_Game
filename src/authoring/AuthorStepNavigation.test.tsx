// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthorStepNavigation } from './AuthorStepNavigation'

afterEach(cleanup)

describe('AuthorStepNavigation', () => {
  it('exposes all nine steps but only enables current and visited steps', async () => {
    const onSelectStep = vi.fn()
    const user = userEvent.setup()
    render(<AuthorStepNavigation currentStep={3} visitedSteps={new Set([1, 2, 3])} onSelectStep={onSelectStep} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(9)
    expect(screen.getByRole('button', { name: /3Formula and scope/ })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /4Editable controls/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /1Learning objective/ }))
    expect(onSelectStep).toHaveBeenCalledWith(1)
  })
})
