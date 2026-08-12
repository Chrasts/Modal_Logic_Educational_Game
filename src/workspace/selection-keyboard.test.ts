// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { resolveDeleteSelection, shouldBeginValuationEdit } from './selection-keyboard'

describe('resolveDeleteSelection', () => {
  it.each(['Delete', 'Backspace'])('prefers an editable selected world for %s', (key) => {
    expect(resolveDeleteSelection({ key, target: document.body, selectedWorldKey: 2, selectedEdgeKey: null, canEditWorlds: true, canEditEdges: true })).toEqual({ kind: 'world', key: 2 })
  })

  it('returns an editable selected edge and ignores text entry or locked selections', () => {
    expect(resolveDeleteSelection({ key: 'Delete', target: document.body, selectedWorldKey: null, selectedEdgeKey: 4, canEditWorlds: true, canEditEdges: true })).toEqual({ kind: 'edge', key: 4 })
    expect(resolveDeleteSelection({ key: 'Delete', target: document.createElement('input'), selectedWorldKey: 2, selectedEdgeKey: null, canEditWorlds: true, canEditEdges: true })).toBeNull()
    expect(resolveDeleteSelection({ key: 'Delete', target: document.body, selectedWorldKey: 2, selectedEdgeKey: null, canEditWorlds: false, canEditEdges: true })).toBeNull()
  })
})

describe('shouldBeginValuationEdit', () => {
  const editable = { key: 'p', target: document.body, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, hasSelectedWorld: true, valuationsVisible: true, canEditValuations: true, overlayOpen: false }

  it('accepts a printable atom character for an editable selected world', () => {
    expect(shouldBeginValuationEdit(editable)).toBe(true)
    expect(shouldBeginValuationEdit({ ...editable, key: 'q' })).toBe(true)
    expect(shouldBeginValuationEdit({ ...editable, key: '2' })).toBe(true)
  })

  it('does not steal controls, shortcuts, locked tasks, or overlay input', () => {
    expect(shouldBeginValuationEdit({ ...editable, key: 'Delete' })).toBe(false)
    expect(shouldBeginValuationEdit({ ...editable, key: 'ArrowRight' })).toBe(false)
    expect(shouldBeginValuationEdit({ ...editable, ctrlKey: true })).toBe(false)
    expect(shouldBeginValuationEdit({ ...editable, metaKey: true })).toBe(false)
    expect(shouldBeginValuationEdit({ ...editable, canEditValuations: false })).toBe(false)
    expect(shouldBeginValuationEdit({ ...editable, overlayOpen: true })).toBe(false)
    expect(shouldBeginValuationEdit({ ...editable, target: document.createElement('input') })).toBe(false)
  })
})
