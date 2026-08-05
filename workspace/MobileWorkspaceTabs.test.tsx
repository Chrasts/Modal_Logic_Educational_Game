// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MobileWorkspaceTabs, type MobileWorkspaceTab } from './MobileWorkspaceTabs'

afterEach(cleanup)

function Harness() {
  const [tab, setTab] = useState<MobileWorkspaceTab>('model')
  return <MobileWorkspaceTabs activeTab={tab} showFormula onChange={setTab} />
}

describe('MobileWorkspaceTabs', () => {
  it('switches all workspace tabs by keyboard, including arrow navigation', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const model = screen.getByRole('tab', { name: 'model' })
    model.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'formula' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'result' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Home}')
    expect(model).toHaveAttribute('aria-selected', 'true')
  })
})
