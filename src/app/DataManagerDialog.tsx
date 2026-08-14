export function DataManagerDialog({ backupSource, modelSource, message, onBackupSourceChange, onModelSourceChange, onDownloadBackup, onImportBackup, onDownloadModel, onImportModel, onResetProgress, onResetSandbox, onClose }: {
  readonly backupSource: string
  readonly modelSource: string
  readonly message: string
  readonly onBackupSourceChange: (value: string) => void
  readonly onModelSourceChange: (value: string) => void
  readonly onDownloadBackup: () => void
  readonly onImportBackup: () => void
  readonly onDownloadModel: () => void
  readonly onImportModel: () => void
  readonly onResetProgress: () => void
  readonly onResetSandbox: () => void
  readonly onClose: () => void
}) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="help-dialog data-dialog" role="dialog" aria-modal="true" aria-labelledby="data-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><p className="eyebrow">Local data</p><h2 id="data-title">Data management</h2></div><button type="button" className="dialog-close" onClick={onClose} aria-label="Close data manager">×</button></div>
      <p className="dialog-intro">Learn and Campaign progress, attempt history, and Model Sandbox are saved in this browser. There is no account or cloud synchronization.</p>
      <div className="data-actions">
        <article><h3>Progress backup</h3><p>The versioned backup includes your guest profile, attempt history, Learn and Campaign progress, assistance state, and saved sandbox model. Device settings, panel layout, and tour state are not included.</p><label><span>Progress backup JSON</span><textarea aria-label="Progress backup JSON" value={backupSource} onChange={(event) => onBackupSourceChange(event.target.value)} spellCheck={false} /></label><div><button type="button" className="secondary-button" onClick={onDownloadBackup}>Download progress backup</button><button type="button" className="primary-action" onClick={onImportBackup}>Import progress backup</button></div></article>
        <article><h3>Model Sandbox</h3><p>Move only the current sandbox model, formula, scope, and frame rules.</p><label><span>Model JSON</span><textarea aria-label="Model JSON" value={modelSource} onChange={(event) => onModelSourceChange(event.target.value)} spellCheck={false} /></label><div><button type="button" className="secondary-button" onClick={onDownloadModel}>Download current model</button><button type="button" className="primary-action" onClick={onImportModel}>Import model JSON</button></div></article>
        <article className="data-reset-card"><h3>Reset local data</h3><p>These actions affect only this browser and require confirmation.</p><button type="button" className="danger-button" onClick={onResetProgress}>Reset learning progress</button><button type="button" className="danger-button" onClick={onResetSandbox}>Reset saved Model Sandbox</button></article>
      </div>
      {message && <p className="data-message" role="status">{message}</p>}
    </section>
  </div>
}
