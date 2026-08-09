import { describe, expect, it } from 'vitest'
import { playSound } from './sound-effects'

describe('sound effects', () => {
  it('is an immediate no-op while disabled', () => {
    expect(() => playSound('success', false)).not.toThrow()
  })
})
