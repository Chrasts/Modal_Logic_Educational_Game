// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReferenceView } from './ReferenceView'

afterEach(cleanup)

describe('ReferenceView', () => {
  it('provides six visual mathematical lookup sections', async () => {
    render(<ReferenceView onOpenLearn={vi.fn()} onOpenLab={vi.fn()} />)
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(screen.getByText(/F = ⟨W,R⟩/)).toBeVisible()
    expect(screen.getByText(/M = ⟨W,R,ν⟩/)).toBeVisible()
    expect(screen.getByText(/M,w ⊨ □φ/)).toBeVisible()
    expect(screen.getByText(/M,w ⊨ ◇φ/)).toBeVisible()
    expect(screen.getByText('Vacuous truth')).toBeVisible()
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('tab', { name: 'Truth scopes' }))
    expect(screen.getByText(/F ⊨ φ/)).toBeVisible()
    expect(screen.getByRole('table', { name: 'How the semantic scope changes' })).toBeVisible()
    await userEvent.click(screen.getByRole('tab', { name: 'Frames and systems' }))
    for (const system of ['T', 'D', 'B', '4', '5']) expect(screen.getByRole('rowheader', { name: system })).toBeVisible()
    expect(screen.getByText(/not a proof of the general theorem/i)).toBeVisible()
  })

  it('offers curated external resources safely', async () => {
    render(<ReferenceView onOpenLearn={vi.fn()} onOpenLab={vi.fn()} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Further reading' }))
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(4)
    links.forEach((link) => { expect(link).toHaveAttribute('target', '_blank'); expect(link).toHaveAttribute('rel', 'noreferrer') })
  })
})
