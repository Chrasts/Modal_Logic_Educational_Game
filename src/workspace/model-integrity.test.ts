import { describe, expect, it } from 'vitest'
import { deleteWorldFromEditableModel, validateEditableModel, validateExplicitEdgeCandidate, validateWorldIdCandidate } from './model-integrity'

describe('editable model integrity', () => {
  const worlds = [{ id: 'w0' }, { id: 'w1' }]
  it('requires committed world ids to be non-empty and unique after trimming', () => {
    expect(validateWorldIdCandidate(worlds, 1, '  ')).toMatch(/empty/i)
    expect(validateWorldIdCandidate(worlds, 1, ' w0 ')).toMatch(/already exists/i)
    expect(validateWorldIdCandidate(worlds, 1, ' alpha ')).toBeNull()
  })

  it('reports missing endpoints and duplicate ordered pairs without repairing them', () => {
    expect(validateEditableModel([{ id: 'w0' }, { id: ' w0 ' }, { id: '' }], [
      { from: 'w0', to: 'missing' }, { from: 'w0', to: 'missing' },
    ]).map(({ kind }) => kind)).toEqual([
      'duplicate-world-id', 'empty-world-id', 'missing-edge-target', 'missing-edge-target', 'duplicate-edge',
    ])
  })

  it('permits self-relations but rejects duplicate or incomplete relations', () => {
    expect(validateExplicitEdgeCandidate(worlds, [], 'w0', 'w0')).toBeNull()
    expect(validateExplicitEdgeCandidate(worlds, [{ from: 'w0', to: 'w1' }], 'w0', 'w1')).toMatch(/already exists/i)
    expect(validateExplicitEdgeCandidate(worlds, [], '', 'w1')).toMatch(/source/i)
  })

  it('deletes a world as an induced submodel without bridging and chooses a nearest-index evaluation fallback', () => {
    const deletion = deleteWorldFromEditableModel(
      [{ key: 0, id: 'a' }, { key: 1, id: 'b' }, { key: 2, id: 'c' }, { key: 3, id: 'd' }],
      [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'd', to: 'b' }, { from: 'b', to: 'b' }],
      1,
      'b',
    )!
    expect(deletion.worlds.map(({ id }) => id)).toEqual(['a', 'c', 'd'])
    expect(deletion.edges).toEqual([])
    expect(deletion.edges).not.toContainEqual({ from: 'a', to: 'c' })
    expect(deletion.evaluationWorld).toBe('c')
    expect(deletion.incidentRelationCount).toBe(4)
  })

  it('allows deleting the final world into an empty editor', () => {
    expect(deleteWorldFromEditableModel([{ key: 0, id: 'only' }], [{ from: 'only', to: 'only' }], 0, 'only')).toMatchObject({ worlds: [], edges: [], evaluationWorld: '', incidentRelationCount: 1 })
  })
})
