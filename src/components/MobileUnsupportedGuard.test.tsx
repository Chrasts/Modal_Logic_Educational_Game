// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileUnsupportedGuard } from './MobileUnsupportedGuard'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const matchMedia = (matches: boolean) => vi.fn(() => ({ matches, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() }))

describe('MobileUnsupportedGuard', () => {
  it('shows the desktop-required notice for a phone-class media match', () => {
    vi.stubGlobal('matchMedia', matchMedia(true))
    render(<MobileUnsupportedGuard><p>Application</p></MobileUnsupportedGuard>)
    expect(screen.getByRole('heading', { name: 'Desktop required' })).toBeVisible()
    expect(screen.queryByText('Application')).not.toBeInTheDocument()
  })
  it('renders the app when the conservative condition does not match', () => {
    vi.stubGlobal('matchMedia', matchMedia(false))
    render(<MobileUnsupportedGuard><p>Application</p></MobileUnsupportedGuard>)
    expect(screen.getByText('Application')).toBeVisible()
  })
})
