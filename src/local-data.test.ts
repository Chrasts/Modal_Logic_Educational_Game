import { describe, expect, it } from 'vitest'
import { emptyLearnProgress } from './learn-progress'
import { parseProgressBackup, parseSandboxModel, serializeProgressBackup } from './local-data'

describe('local data formats', () => {
  it('round-trips a version 2 progress backup and migrates Learn progress', () => {
    const source = serializeProgressBackup({ contentRevision: 2, guest: { id: 'g', createdAt: '2026-01-01', history: [] }, completedLevelIds: ['x'], learnProgress: emptyLearnProgress(), referenceSolutionViewed: [], sandbox: { format: 'logic-model-builder' } })
    expect(parseProgressBackup(source)).toMatchObject({ format: 'logic-model-builder-progress-backup', version: 2, completedLevelIds: ['x'] })
  })

  it('accepts a legacy profile backup without inventing newer fields', () => {
    expect(parseProgressBackup({ format: 'logic-model-builder-profile', version: 1, guest: { id: 'g' }, completedLevelIds: [] })).not.toHaveProperty('learnProgress')
  })

  it('rejects invalid backup and model payloads', () => {
    expect(() => parseProgressBackup('{}')).toThrow(/unsupported/i)
    expect(() => parseSandboxModel({ format: 'logic-model-builder', version: 1, formula: 'p', worlds: [], edges: [] })).toThrow(/at least one world/i)
  })
})
