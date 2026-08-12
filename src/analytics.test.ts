// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackEvent } from './analytics'

describe('analytics', () => {
  afterEach(() => {
    delete window.umami
  })

  it('is a no-op when Umami is unavailable', () => {
    expect(() => trackEvent('section_view', { section: 'lab' })).not.toThrow()
  })

  it('forwards only the explicitly supplied coarse event data', () => {
    const track = vi.fn()
    window.umami = { track }

    trackEvent('activity_complete', { area: 'learn' })

    expect(track).toHaveBeenCalledOnce()
    expect(track).toHaveBeenCalledWith('activity_complete', { area: 'learn' })
  })

  it('does not let tracker failures affect the application', () => {
    window.umami = { track: vi.fn(() => { throw new Error('network failure') }) }
    expect(() => trackEvent('hint_reveal', { hint_number: 1 })).not.toThrow()
  })
})
