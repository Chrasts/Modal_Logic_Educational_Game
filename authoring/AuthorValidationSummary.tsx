import type { MissionAuditFinding } from '../mission-audit'

const groups = [
  { severity: 'error', title: 'Blocking errors' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Information' },
  { severity: 'pass', title: 'Passed checks' },
] as const

export function AuthorValidationSummary({ findings, onGoToStep }: { readonly findings: readonly MissionAuditFinding[]; readonly onGoToStep: (step: number) => void }) {
  if (findings.length === 0) return <p>No audit has been run for this draft yet.</p>
  return <div className="author-validation-groups">
    {groups.map(({ severity, title }) => {
      const matching = findings.filter((finding) => finding.severity === severity)
      if (matching.length === 0) return null
      return <section key={severity} aria-labelledby={`audit-${severity}`}>
        <h5 id={`audit-${severity}`}>{title} ({matching.length})</h5>
        <ul>{matching.map((finding) => <li className={finding.severity} key={`${finding.check}:${finding.detail}`}>
          <div><b>{finding.check}</b><span>{finding.detail}</span></div>
          {finding.step && <button type="button" className="text-button" onClick={() => onGoToStep(finding.step!)}>Go to step {finding.step}</button>}
        </li>)}</ul>
      </section>
    })}
  </div>
}
