// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LabView } from './LabView'

afterEach(cleanup)

describe('LabView', () => {
  it('presents only the real shared Model Sandbox and delegates opening it', async () => {
    const onOpenModelSandbox = vi.fn()
    const user = userEvent.setup()
    render(<LabView onOpenModelSandbox={onOpenModelSandbox} />)
    expect(screen.getByRole('heading', { name: 'Lab' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Model Sandbox' })).toBeVisible()
    expect(screen.getByText('Inspect evaluation traces')).toBeVisible()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open Model Sandbox' }))
    expect(onOpenModelSandbox).toHaveBeenCalledOnce()
  })
})
