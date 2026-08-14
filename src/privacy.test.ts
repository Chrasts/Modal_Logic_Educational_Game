import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'

describe('shipped HTML privacy', () => {
  it('ships the declared Umami Cloud analytics script and no other remote scripts', () => {
    const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/giu)]
      .map((match) => match[1])

    expect(externalScripts).toEqual(['https://cloud.umami.is/script.js'])
    expect(html).toMatch(/data-website-id=["'][^"']+["']/u)
  })
})
