// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceTour } from './WorkspaceTour'

afterEach(() => { cleanup(); document.body.innerHTML = '' })

describe('WorkspaceTour', () => {
  it('uses live target coordinates and skips unavailable targets', async () => {
    const target = document.createElement('div')
    target.dataset.tourTarget = 'model-map'
    target.getBoundingClientRect = () => ({ left: 20, top: 30, width: 200, height: 100, right: 220, bottom: 130, x: 20, y: 30, toJSON: () => ({}) })
    document.body.append(target)
    render(<WorkspaceTour sandbox onClose={vi.fn()} onDone={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Model map' })).toBeVisible()
    expect(screen.getByTestId('workspace-tour-highlight')).toHaveStyle({ left: '12px', top: '22px' })
  })

  it('moves forward and closes with Done', async () => {
    for (const name of ['model-map', 'editing-controls', 'formula-controls', 'map-toolbar', 'result-area']) { const node = document.createElement('div'); node.dataset.tourTarget = name; document.body.append(node) }
    const onDone = vi.fn()
    render(<WorkspaceTour sandbox onClose={vi.fn()} onDone={onDone} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Edit model' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Model map' })).toBeVisible()
    for (let step = 0; step < 4; step += 1) await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
