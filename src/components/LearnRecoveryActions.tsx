export function LearnRecoveryActions({ relatedTitle, onReview, onHint, onRelated }: { readonly relatedTitle?: string; readonly onReview: () => void; readonly onHint: () => void; readonly onRelated?: () => void }) {
  return <div className="learn-recovery-actions" aria-label="Learning support after repeated attempts">
    <strong>Need a different route?</strong>
    <button type="button" className="secondary-button" onClick={onReview}>Review concept</button>
    <button type="button" className="secondary-button" onClick={onHint}>Show Hint 3</button>
    {relatedTitle && onRelated && <button type="button" className="secondary-button" onClick={onRelated}>Try a related lesson: {relatedTitle}</button>}
    <small>These options do not reduce progress or add a penalty. You can keep working on this lesson.</small>
  </div>
}
