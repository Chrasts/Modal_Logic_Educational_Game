import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'

describe('shipped HTML privacy', () => {
  it('does not load externally hosted analytics scripts', () => {
    expect(html).not.toContain('cloud.umami.is')
    expect(html).not.toMatch(/<script\b[^>]*\bsrc=["']https?:\/\//iu)
  })
})
