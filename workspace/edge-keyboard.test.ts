// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { isTextEntryTarget, shouldDeleteSelectedEdge } from './edge-keyboard'

describe('edge keyboard interaction', () => {
  it.each(['Backspace', 'Delete'])('deletes a selected editable edge with %s', (key) => {
    expect(shouldDeleteSelectedEdge({ key, target: document.body, selectedEdgeKey: 4, canEditEdges: true })).toBe(true)
  })

  it('does not delete locked, unselected, or text-entry edges', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isTextEntryTarget(input)).toBe(true)
    expect(isTextEntryTarget(textarea)).toBe(true)
    expect(isTextEntryTarget(select)).toBe(true)
    expect(isTextEntryTarget(editable)).toBe(true)
    expect(shouldDeleteSelectedEdge({ key: 'Backspace', target: input, selectedEdgeKey: 4, canEditEdges: true })).toBe(false)
    expect(shouldDeleteSelectedEdge({ key: 'Delete', target: document.body, selectedEdgeKey: null, canEditEdges: true })).toBe(false)
    expect(shouldDeleteSelectedEdge({ key: 'Delete', target: document.body, selectedEdgeKey: 4, canEditEdges: false })).toBe(false)
  })
})
