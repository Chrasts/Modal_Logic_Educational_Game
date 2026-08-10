// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { resolveDeleteSelection } from './selection-keyboard'

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
