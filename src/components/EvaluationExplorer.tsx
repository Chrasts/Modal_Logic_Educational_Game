import type { Formula } from '../logic'
import { listFormulaOccurrences, type SemanticHighlight } from '../logic/evaluation-explorer'

export function EvaluationExplorer({ open, formula, selectedPath, highlight, onToggle, onSelect }: {
  readonly open: boolean
  readonly formula?: Formula
  readonly selectedPath: string
  readonly highlight?: SemanticHighlight
  readonly onToggle: () => void
  readonly onSelect: (path: string) => void
}) {
  const occurrences = formula ? listFormulaOccurrences(formula) : []
  const selected = occurrences.find(({ key }) => key === selectedPath) ?? occurrences[0]
  return <section className="evaluation-explorer" aria-labelledby="evaluation-explorer-title">
    <button type="button" className="evaluation-explorer-toggle" aria-expanded={open} aria-controls="evaluation-explorer-content" onClick={onToggle}>
      <span><strong id="evaluation-explorer-title">Evaluation Explorer</strong><small>Explore subformulas in the model</small></span><b aria-hidden="true">{open ? '−' : '+'}</b>
    </button>
    {open && <div id="evaluation-explorer-content" className="evaluation-explorer-content">
      {!formula || !selected || !highlight ? <p className="empty-state">Enter a valid formula to explore its semantics.</p> : <>
        <div className="explorer-section"><span className="explorer-label">Formula structure</span><div role="tree" aria-label="Formula structure" className="formula-tree">{occurrences.map((occurrence) => <button
          type="button"
          role="treeitem"
          aria-level={occurrence.depth + 1}
          aria-selected={occurrence.key === selected.key}
          className={occurrence.key === selected.key ? 'selected' : ''}
          style={{ paddingInlineStart: `${.55 + occurrence.depth * .8}rem` }}
          key={occurrence.key}
          onClick={() => onSelect(occurrence.key)}
        ><span aria-hidden="true">{occurrence.key === selected.key ? '▸' : '·'}</span><code>{occurrence.formatted}</code></button>)}</div></div>
        <div className="explorer-section selected-subformula"><span className="explorer-label">Selected subformula</span><code>{selected.formatted}</code><strong className={highlight.trace?.value ? 'true' : 'false'}>{highlight.trace?.value ? 'TRUE' : 'FALSE'} at {highlight.trace?.worldId}</strong>{highlight.trace && <p>{highlight.trace.summary}</p>}{highlight.trace?.diagnostic && <small>{highlight.trace.diagnostic}</small>}</div>
        <div className="explorer-section"><span className="explorer-label">Model view</span><div className="explorer-legend"><span><i className="true" />✓ True</span><span><i className="false" />✕ False</span></div>{highlight.witnessWorlds.size > 0 && <p><strong>Witness:</strong> {[...highlight.witnessWorlds].join(', ')}</p>}{highlight.counterexampleWorlds.size > 0 && <p><strong>Counterexample:</strong> {[...highlight.counterexampleWorlds].join(', ')}</p>}</div>
      </>}
    </div>}
  </section>
}
