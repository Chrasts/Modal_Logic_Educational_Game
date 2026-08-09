import type { EvaluationTrace } from '../logic'

export function EvaluationTree({ trace, root = false, activeTrace, onSelect }: { readonly trace: EvaluationTrace; readonly root?: boolean; readonly activeTrace?: EvaluationTrace; readonly onSelect?: (trace: EvaluationTrace) => void }) {
  return (
    <details className={`evaluation-node ${trace.value ? 'true' : 'false'} ${trace === activeTrace ? 'active' : ''}`} open={root || trace === activeTrace}>
      <summary onClick={() => onSelect?.(trace)}>
        <code>{trace.worldId} ⊨ {trace.formula}</code>
        <b>{trace.value ? 'True' : 'False'}</b>
      </summary>
      <div className="evaluation-node-body">
        <span>{trace.summary}</span>
        {trace.diagnostic && <em>{trace.diagnostic}</em>}
        {trace.children.length > 0 && <div className="evaluation-children">{trace.children.map((child, index) => <EvaluationTree trace={child} activeTrace={activeTrace} onSelect={onSelect} key={`${child.worldId}:${child.formula}:${index}`} />)}</div>}
      </div>
    </details>
  )
}

const collectEvaluationDiagnostics = (traces: readonly EvaluationTrace[]): readonly string[] => {
  const diagnostics = new Set<string>()
  const visit = (trace: EvaluationTrace): void => {
    if (trace.diagnostic) diagnostics.add(trace.diagnostic)
    trace.children.forEach(visit)
  }
  traces.forEach(visit)
  return [...diagnostics].slice(0, 4)
}

export function EvaluationDiagnostics({ traces }: { readonly traces: readonly EvaluationTrace[] }) {
  const diagnostics = collectEvaluationDiagnostics(traces)
  if (diagnostics.length === 0) return null
  return <div className="diagnostic-highlights"><span>Key diagnostics</span><ul>{diagnostics.map((diagnostic) => <li key={diagnostic}>{diagnostic}</li>)}</ul></div>
}

export interface EvaluationTraceEntry { readonly trace: EvaluationTrace; readonly parent?: EvaluationTrace }

export function flattenEvaluationTraces(traces: readonly EvaluationTrace[]): readonly EvaluationTraceEntry[] {
  const entries: EvaluationTraceEntry[] = []
  const visit = (trace: EvaluationTrace, parent?: EvaluationTrace) => {
    entries.push({ trace, parent })
    trace.children.forEach((child) => visit(child, trace))
  }
  traces.forEach((trace) => visit(trace))
  return entries
}
