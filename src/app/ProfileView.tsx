interface ProfileHistoryEntry {
  readonly id: string
  readonly timestamp: string
  readonly title: string
  readonly mode: string
  readonly scope: string
  readonly success: boolean
  readonly worldCount: number
  readonly edgeCount: number
  readonly trueAtomCount?: number
  readonly semanticChanges?: number
  readonly bonusAchieved?: boolean
}

interface ProfileViewProps {
  readonly guestId: string
  readonly createdAt: string
  readonly history: readonly ProfileHistoryEntry[]
  readonly successfulAttempts: number
  readonly completedHistoryLevels: number
  readonly savedCompletedLevels: number
  readonly distinctSolutions: number
  readonly conceptSummary: readonly (readonly [string, { readonly attempts: number; readonly successes: number }])[]
  readonly failureSummary: readonly (readonly [string, number])[]
  readonly failureLabel: (category: string) => string
  readonly onDownloadProfile: () => void
  readonly onImportBackup: () => void
  readonly onDownloadResults: () => void
  readonly onClearHistory: () => void
}

export function ProfileView({ guestId, createdAt, history, successfulAttempts, completedHistoryLevels, savedCompletedLevels, distinctSolutions, conceptSummary, failureSummary, failureLabel, onDownloadProfile, onImportBackup, onDownloadResults, onClearHistory }: ProfileViewProps) {
  return <section className="content-screen profile-screen" aria-labelledby="profile-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Local guest</p><h1 id="profile-title" className="clean-display">Profile and history</h1><p>This anonymous profile belongs to this browser only. No IP address, fingerprint, e-mail, or other personal identifier is collected.</p></div><div className="profile-actions"><button type="button" className="primary-action" onClick={onDownloadProfile}>Download profile</button><button type="button" className="secondary-button" onClick={onImportBackup}>Import backup</button></div></div>
    <div className="profile-summary"><article><span>Guest ID</span><strong>{guestId.slice(0, 8)}</strong><small>Created {new Date(createdAt).toLocaleDateString()}</small></article><article><span>Attempts</span><strong>{history.length}</strong><small>{successfulAttempts} successful verifications</small></article><article><span>Unique tasks solved</span><strong>{completedHistoryLevels}</strong><small>{savedCompletedLevels} task{savedCompletedLevels === 1 ? '' : 's'} in saved progress</small></article><article><span>Distinct solutions</span><strong>{distinctSolutions}</strong><small>Up to isomorphism within each mission</small></article></div>
    <div className="educator-export"><div><p className="eyebrow">Educator tools</p><h2>Export local results</h2><p>Download anonymous attempt-level data for a spreadsheet or learning review. The file contains this guest ID, mission context, outcomes, failure categories, and construction metrics. It never leaves this browser unless you share it.</p></div><button type="button" className="secondary-button" onClick={onDownloadResults} disabled={history.length === 0}>Download results CSV</button></div>
    {(conceptSummary.length > 0 || failureSummary.length > 0) && <div className="profile-insights"><article><p className="eyebrow">Concepts</p><h2>Practice by concept</h2>{conceptSummary.length ? <ul>{conceptSummary.map(([concept, counts]) => <li key={concept}><span>{concept}</span><b>{counts.successes}/{counts.attempts}</b></li>)}</ul> : <p>No classified attempts yet.</p>}</article><article><p className="eyebrow">Diagnostics</p><h2>Failure categories</h2>{failureSummary.length ? <ul>{failureSummary.map(([category, count]) => <li key={category}><span>{failureLabel(category)}</span><b>{count}</b></li>)}</ul> : <p>No classified failures yet.</p>}</article></div>}
    <div className="history-heading"><div><p className="eyebrow">Recent activity</p><h2>Verification history</h2></div>{history.length > 0 && <button type="button" className="danger-button" onClick={onClearHistory}>Clear history</button>}</div>
    {history.length === 0 ? <div className="profile-empty"><strong>No attempts recorded yet</strong><span>Verify an objective in the sandbox, Learn, or a campaign. Up to 250 recent attempts are kept locally.</span></div> : <div className="history-list">{history.map((entry) => <article key={entry.id}><time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString()}</time><div><strong>{entry.title}</strong><span>{entry.mode} · {entry.scope} · {entry.worldCount} worlds · {entry.edgeCount} explicit relations{entry.trueAtomCount !== undefined ? ` · ${entry.trueAtomCount} true atoms` : ''}{entry.semanticChanges !== undefined ? ` · ${entry.semanticChanges} changes` : ''}</span></div><b className={entry.success ? 'success' : 'failure'}>{entry.success ? 'Success' : 'Failed'}</b>{entry.bonusAchieved !== undefined && <em>{entry.bonusAchieved ? 'Bonus' : 'No bonus'}</em>}</article>)}</div>}
  </section>
}
