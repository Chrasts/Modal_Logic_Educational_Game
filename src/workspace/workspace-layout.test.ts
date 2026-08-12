import { describe, expect, it } from 'vitest'
import { defaultWorkspaceLayout, normalizeWorkspaceLayout, resizeWorkspaceSide, WORKSPACE_MAP_MIN, WORKSPACE_SIDE_MAX, WORKSPACE_SIDE_MIN } from './workspace-layout'

describe('desktop workspace layout', () => {
  it('normalizes missing and invalid persisted values safely', () => {
    expect(normalizeWorkspaceLayout(null)).toEqual(defaultWorkspaceLayout)
    expect(normalizeWorkspaceLayout({ left: -20, right: 9999 })).toEqual({ left: WORKSPACE_SIDE_MIN, right: WORKSPACE_SIDE_MAX })
    expect(normalizeWorkspaceLayout({ left: 'bad', right: 280 })).toEqual({ left: defaultWorkspaceLayout.left, right: 280 })
  })

  it('clamps either side while giving ordinary resize space to the map first', () => {
    expect(resizeWorkspaceSide(defaultWorkspaceLayout, 'left', 300, 1200)).toEqual({ left: 300, right: 242 })
    expect(resizeWorkspaceSide(defaultWorkspaceLayout, 'right', 80, 1200)).toEqual({ left: 242, right: WORKSPACE_SIDE_MIN })
  })

  it('redistributes from the opposite side after the map reaches its minimum', () => {
    const available = WORKSPACE_MAP_MIN + 650
    expect(resizeWorkspaceSide({ left: 300, right: 300 }, 'left', 400, available)).toEqual({ left: 400, right: 250 })
    expect(resizeWorkspaceSide({ left: 300, right: 300 }, 'right', 400, available)).toEqual({ left: 250, right: 400 })
  })

  it('stops cleanly when both side minima and the map minimum consume all space', () => {
    const available = WORKSPACE_MAP_MIN + WORKSPACE_SIDE_MIN * 2
    expect(resizeWorkspaceSide(defaultWorkspaceLayout, 'left', WORKSPACE_SIDE_MAX, available)).toEqual({ left: WORKSPACE_SIDE_MIN, right: WORKSPACE_SIDE_MIN })
  })
})
