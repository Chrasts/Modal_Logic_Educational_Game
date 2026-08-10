export function ProgressiveHints({ hints, revealed, onReveal }: { readonly hints: readonly string[]; readonly revealed: number; readonly onReveal: (index: number) => void }) {
  const visible = hints.slice(0, revealed)
  return <div className="progressive-hints">
    {visible.map((hint, index) => <p key={hint}><strong>Hint {index + 1}.</strong> {hint}</p>)}
    {revealed < hints.length && <button type="button" className="secondary-button" onClick={() => onReveal(revealed + 1)}>Reveal hint {revealed + 1}</button>}
  </div>
}
