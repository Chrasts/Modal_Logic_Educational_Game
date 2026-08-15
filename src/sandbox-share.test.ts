import { describe, expect, it } from 'vitest'
import { createShareUrl, readSharedJson } from './share-url'
import { createSandboxSharePayload, parseSandboxSharePayload, type SandboxShareState } from './sandbox-share'

const state: SandboxShareState = {
  worlds: [{ id: 'w0', atoms: [] }, { id: 'w1', atoms: ['p'] }],
  edges: [{ from: 'w0', to: 'w1' }],
  evaluationWorld: 'w0', formula: '[]p', comparisonFormula: '<>p', scope: 'model', targetTruth: false,
  frameRules: { reflexive: 'off', symmetric: 'validate', transitive: 'off', euclidean: 'off', serial: 'off', irreflexive: 'off', acyclic: 'off' },
}

describe('Sandbox sharing', () => {
  it('round-trips the mathematical Sandbox state through a share URL', () => {
    const payload = createSandboxSharePayload(state)
    const url = createShareUrl(JSON.stringify(payload), { href: 'https://example.test/app' } as Location)
    expect(parseSandboxSharePayload(readSharedJson({ hash: new URL(url).hash })!)).toEqual(payload)
  })

  it('rejects unknown versions, broken edges, duplicate edges, and missing evaluation worlds', () => {
    const payload = createSandboxSharePayload(state)
    expect(() => parseSandboxSharePayload({ ...payload, version: 2 })).toThrow(/version/i)
    expect(() => parseSandboxSharePayload({ ...payload, edges: [{ from: 'w0', to: 'missing' }] })).toThrow(/unknown world/i)
    expect(() => parseSandboxSharePayload({ ...payload, edges: [payload.edges[0], payload.edges[0]] })).toThrow(/unique/i)
    expect(() => parseSandboxSharePayload({ ...payload, evaluationWorld: 'missing' })).toThrow(/does not exist/i)
  })

  it('retains the existing share URL size protection', () => {
    expect(() => createShareUrl(JSON.stringify({ ...createSandboxSharePayload(state), padding: 'x'.repeat(60_000) }), { href: 'https://example.test/app' } as Location)).toThrow(/too large/i)
  })
})
