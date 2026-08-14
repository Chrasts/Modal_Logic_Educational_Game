import { forwardRef, type ReactNode } from 'react'

export type VerificationSummaryState = 'idle' | 'success' | 'failure' | 'error'

interface VerificationSummaryProps {
  readonly state: VerificationSummaryState
  readonly summary?: string
  readonly actions?: ReactNode
  readonly children?: ReactNode
}

const headings: Record<Exclude<VerificationSummaryState, 'idle'>, string> = {
  success: 'Objective met',
  failure: 'Not yet',
  error: 'Verification error',
}

export const VerificationSummary = forwardRef<HTMLDivElement, VerificationSummaryProps>(function VerificationSummary({ state, summary, actions, children }, ref) {
  const active = state !== 'idle'
  return <div
    ref={ref}
    data-tour-target="result-area"
    tabIndex={-1}
    className={`result ${active ? state : ''}`}
    role={active ? state === 'error' ? 'alert' : 'status' : undefined}
    aria-live={active ? state === 'error' ? 'assertive' : 'polite' : undefined}
    aria-atomic={active ? 'true' : undefined}
  >
    {active ? <>
      <div className="verification-summary">
        <span className="verification-state-icon" aria-hidden="true">{state === 'success' ? '✓' : state === 'failure' ? '!' : '×'}</span>
        <div><strong>{headings[state]}</strong>{summary && <p>{summary}</p>}</div>
      </div>
      {actions && <div className="verification-summary-actions">{actions}</div>}
      {children && <details className="semantic-result-details"><summary>Semantic details</summary><div>{children}</div></details>}
    </> : <p className="verification-idle">The verification result will appear here.</p>}
  </div>
})
