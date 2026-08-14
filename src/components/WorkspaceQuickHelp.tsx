interface WorkspaceQuickHelpProps {
  readonly onClose: () => void
  readonly onOpenHelp: () => void
  readonly onReplayTour: () => void
}

const quickHelpSections = [
  ['Edit the model', 'Add worlds and accessibility relations with the available controls. Select a world to edit its name or true atoms. Guided tasks expose only permitted edits.'],
  ['Navigate the map', 'Drag empty space to pan. Use the mouse wheel to zoom, a two-finger touchpad gesture to pan, and pinch to zoom. Fit model changes only the viewport.'],
  ['Answer questions', 'For world questions, choose a world directly on the graph or with Choose world in the Table view. Other questions provide one answer control above the model.'],
  ['Verify', 'Select Check task after completing the requested edit or answer. The result explains the relevant semantic scope and any failing condition.'],
  ['Keyboard', 'Tab reaches every control. Enter or Space chooses a focused world in a question. Delete removes a selected editable item. Ctrl+Z and Ctrl+Y undo and redo.'],
] as const

export function WorkspaceQuickHelp({ onClose, onOpenHelp, onReplayTour }: WorkspaceQuickHelpProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="help-dialog workspace-quick-help" role="dialog" aria-modal="true" aria-labelledby="quick-help-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading"><div><p className="eyebrow">Workspace reference</p><h2 id="quick-help-title">Quick help</h2></div><button type="button" className="dialog-close" onClick={onClose} aria-label="Close quick help">×</button></div>
        <div className="quick-help-grid">{quickHelpSections.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="quick-help-actions"><button type="button" className="primary-action" onClick={onOpenHelp}>Open full Help</button><button type="button" className="secondary-button" onClick={onReplayTour}>Replay workspace tour</button></div>
      </section>
    </div>
  )
}
