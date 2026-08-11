// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceToolbar } from './WorkspaceToolbar'

afterEach(cleanup)

const renderToolbar = (overrides: Partial<Parameters<typeof WorkspaceToolbar>[0]> = {}) => {
  const actions = {
    onApplyPreset: vi.fn(), onAddWorld: vi.fn(), onDeleteRelation: vi.fn(),
    onToggleEvaluationPanel: vi.fn(), onToggleModelPanel: vi.fn(), onUndo: vi.fn(),
    onRedo: vi.fn(), onTidy: vi.fn(), onToggleDerived: vi.fn(),
    onOpenFrameRules: vi.fn(), onVerify: vi.fn(),
  }
  render(<WorkspaceToolbar sandbox editorMode="edit" rightPanelOpen showWorldPanel showEdgePanel leftPanelOpen canAddWorld canEditWorlds canEditRelations canUseHistory canRepositionWorlds selectedRelation undoAvailable redoAvailable worldCount={2} focusedIntro={false} showDerivedRelations derivedRelationCount={2} frameRuleCount={1} flowInstance={null} {...actions} {...overrides} />)
  return actions
}

describe('WorkspaceToolbar', () => {
  it('groups model, history, viewport and analysis actions', () => {
    renderToolbar()
    expect(screen.getByLabelText('Model actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Panels and history')).toBeInTheDocument()
    expect(screen.getByLabelText('Viewport actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Analysis actions')).toBeInTheDocument()
  })

  it('keeps presets sandbox-only and exposes contextual relation deletion', () => {
    const actions = renderToolbar({ sandbox: false, selectedRelation: true })
    expect(screen.queryByLabelText('Workspace presets')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete relation' }))
    expect(actions.onDeleteRelation).toHaveBeenCalledOnce()
  })
})
