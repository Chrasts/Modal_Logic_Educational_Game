import { describe, expect, it } from 'vitest'
import { insertAtSelection } from './formula-input'

describe('insertAtSelection', () => {
  it('inserts at the caret and replaces a selection', () => {
    expect(insertAtSelection('pq', '□', 1, 1)).toEqual({ value: 'p□q', selectionStart: 2, selectionEnd: 2 })
    expect(insertAtSelection('p and q', '∧', 2, 5)).toEqual({ value: 'p ∧ q', selectionStart: 3, selectionEnd: 3 })
  })
})
