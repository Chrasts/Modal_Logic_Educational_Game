import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

export interface WorkspaceTourStep {
  readonly target: string
  readonly title: string
  readonly body: string
}

const guidedSteps: readonly WorkspaceTourStep[] = [
  { target: 'mission-header', title: 'Task', body: 'The mission header shows the current objective, progress, and available actions.' },
  { target: 'model-map', title: 'Model map', body: 'Inspect worlds, true atoms, and directed accessibility in the live model.' },
  { target: 'editing-controls', title: 'Edit model', body: 'The available controls reflect what this task allows you to change.' },
  { target: 'formula-controls', title: 'Formula and evaluation', body: 'Read the formula and choose the evaluation world when the objective uses pointed truth.' },
  { target: 'check-task', title: 'Check task', body: 'Check your current answer here.' },
  { target: 'result-area', title: 'Results', body: 'After checking, this area explains whether the objective is met and what to inspect next.' },
]

const sandboxSteps: readonly WorkspaceTourStep[] = [guidedSteps[1], guidedSteps[2], guidedSteps[3], { target: 'map-toolbar', title: 'Map tools', body: 'Use the map toolbar to adjust the view, arrange worlds, use history, and open frame controls.' }, guidedSteps[5]]

const targetElement = (name: string) => document.querySelector<HTMLElement>(`[data-tour-target="${name}"]`)

export function WorkspaceTour({ sandbox, initialStep = 0, onStepChange, onClose, onDone }: {
  readonly sandbox: boolean
  readonly initialStep?: number
  readonly onStepChange?: (step: number) => void
  readonly onClose: () => void
  readonly onDone: () => void
}) {
  const steps = sandbox ? sandboxSteps : guidedSteps
  const [index, setIndex] = useState(Math.min(initialStep, steps.length - 1))
  const [rect, setRect] = useState<DOMRect | null>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const step = steps[index]

  const [availableIndexes, setAvailableIndexes] = useState<readonly number[]>(steps.map((_, candidateIndex) => candidateIndex))
  useLayoutEffect(() => {
    const available = steps.map((candidate, candidateIndex) => targetElement(candidate.target) ? candidateIndex : -1).filter((candidateIndex) => candidateIndex >= 0)
    setAvailableIndexes(available.length ? available : [index])
  }, [index, steps])
  useEffect(() => {
    if (targetElement(step.target)) return
    const next = availableIndexes.find((candidate) => candidate > index) ?? availableIndexes.at(-1)
    if (next !== undefined && next !== index) setIndex(next)
  }, [availableIndexes, index, step.target])

  useLayoutEffect(() => {
    const element = targetElement(step.target)
    if (!element) { setRect(null); return }
    const update = () => setRect(element.getBoundingClientRect())
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [step.target])

  useEffect(() => { onStepChange?.(index) }, [index, onStepChange])
  useEffect(() => { dialogRef.current?.querySelector<HTMLButtonElement>('.workspace-tour-next')?.focus() }, [])

  const move = (direction: -1 | 1) => {
    const position = availableIndexes.indexOf(index)
    const next = availableIndexes[position + direction]
    if (next !== undefined) setIndex(next)
  }
  const isLast = availableIndexes.indexOf(index) === availableIndexes.length - 1
  const padding = 8
  const spotlightStyle = rect ? { left: rect.left - padding, top: rect.top - padding, width: rect.width + padding * 2, height: rect.height + padding * 2 } : undefined
  const placeBelow = !rect || rect.bottom + 250 < window.innerHeight
  const tooltipStyle = rect ? {
    left: Math.max(16, Math.min(window.innerWidth - 376, rect.left)),
    top: placeBelow ? Math.min(window.innerHeight - 230, rect.bottom + 16) : Math.max(16, rect.top - 214),
  } as CSSProperties : undefined

  return <div className="workspace-tour-layer" role="presentation">
    <div className="workspace-tour-shield" />
    {spotlightStyle && <div className="workspace-tour-spotlight" data-testid="workspace-tour-highlight" style={spotlightStyle} />}
    <section ref={dialogRef} className="workspace-tour-tooltip" style={tooltipStyle} role="dialog" aria-modal="true" aria-labelledby="workspace-tour-title">
      <div className="dialog-heading"><div><p className="eyebrow">Workspace tour · {availableIndexes.indexOf(index) + 1} of {availableIndexes.length}</p><h2 id="workspace-tour-title">{step.title}</h2></div><button type="button" className="dialog-close" onClick={onClose} aria-label="Skip workspace tour">×</button></div>
      <p>{step.body}</p>
      <div className="workspace-tour-actions"><button type="button" className="text-button" onClick={onClose}>Skip</button><button type="button" disabled={availableIndexes.indexOf(index) <= 0} onClick={() => move(-1)}>Back</button><button type="button" className="primary-action workspace-tour-next" onClick={() => isLast ? onDone() : move(1)}>{isLast ? 'Done' : 'Next'}</button></div>
    </section>
  </div>
}

export const workspaceTourSteps = guidedSteps
