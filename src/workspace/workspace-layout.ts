export const WORKSPACE_SIDE_MIN = 200
export const WORKSPACE_SIDE_DEFAULT = 242
export const WORKSPACE_SIDE_MAX = 440
export const WORKSPACE_MAP_MIN = 520

export interface WorkspaceLayout {
  readonly left: number
  readonly right: number
}

export const defaultWorkspaceLayout: WorkspaceLayout = { left: WORKSPACE_SIDE_DEFAULT, right: WORKSPACE_SIDE_DEFAULT }

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export function normalizeWorkspaceLayout(value: unknown): WorkspaceLayout {
  if (!value || typeof value !== 'object') return defaultWorkspaceLayout
  const candidate = value as Partial<WorkspaceLayout>
  return {
    left: Number.isFinite(candidate.left) ? clamp(Number(candidate.left), WORKSPACE_SIDE_MIN, WORKSPACE_SIDE_MAX) : WORKSPACE_SIDE_DEFAULT,
    right: Number.isFinite(candidate.right) ? clamp(Number(candidate.right), WORKSPACE_SIDE_MIN, WORKSPACE_SIDE_MAX) : WORKSPACE_SIDE_DEFAULT,
  }
}

export function resizeWorkspaceSide(
  layout: WorkspaceLayout,
  side: 'left' | 'right',
  desiredWidth: number,
  availableWidth: number,
): WorkspaceLayout {
  const otherSide = side === 'left' ? 'right' : 'left'
  const desired = clamp(desiredWidth, WORKSPACE_SIDE_MIN, WORKSPACE_SIDE_MAX)
  const capacity = Math.max(WORKSPACE_SIDE_MIN * 2, availableWidth - WORKSPACE_MAP_MIN)
  const nextOther = clamp(Math.min(layout[otherSide], capacity - desired), WORKSPACE_SIDE_MIN, WORKSPACE_SIDE_MAX)
  const nextSide = clamp(Math.min(desired, capacity - nextOther), WORKSPACE_SIDE_MIN, WORKSPACE_SIDE_MAX)
  return side === 'left' ? { left: nextSide, right: nextOther } : { left: nextOther, right: nextSide }
}
