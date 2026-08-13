import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { trackEvent } from '../analytics'

export type MissionHeaderMode = 'learn' | 'campaign' | 'practice' | 'custom'

interface MissionHeaderProps {
  readonly mode: MissionHeaderMode
  readonly sectionTitle: string
  readonly itemTitle: string
  readonly progressLabel: string
  readonly objective: string
  readonly content?: ReactNode
  readonly state?: 'active' | 'question' | 'completed'
  readonly previouslyCompleted?: boolean
  readonly taskSteps?: readonly string[]
  readonly details?: ReactNode
  readonly actions: ReactNode
}

export function MissionHeader({
  mode,
  sectionTitle,
  itemTitle,
  progressLabel,
  objective,
  content,
  state = 'active',
  previouslyCompleted = false,
  taskSteps,
  details,
  actions,
}: MissionHeaderProps) {
  const unit = mode === 'learn' ? 'lesson' : 'mission'
  const headerRef = useRef<HTMLElement>(null)
  const taskKey = `${mode}\u0000${sectionTitle}\u0000${itemTitle}`
  const trackedTaskRef = useRef<string | null>(null)
  const completionStateRef = useRef({ key: taskKey, state })

  useEffect(() => {
    if (state === 'completed') headerRef.current?.focus()
  }, [state])

  useEffect(() => {
    if (trackedTaskRef.current === taskKey) return
    trackedTaskRef.current = taskKey
    trackEvent('guided-task-view', {
      mode,
      section: sectionTitle,
      item: itemTitle,
      previously_completed: previouslyCompleted,
    })
  }, [itemTitle, mode, previouslyCompleted, sectionTitle, taskKey])

  useEffect(() => {
    const previous = completionStateRef.current
    if (previous.key === taskKey && previous.state !== 'completed' && state === 'completed') {
      trackEvent('guided-task-complete', {
        mode,
        section: sectionTitle,
        item: itemTitle,
      })
    }
    completionStateRef.current = { key: taskKey, state }
  }, [itemTitle, mode, sectionTitle, state, taskKey])

  const trackActionClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const element = event.target instanceof Element ? event.target.closest('button') : null
    if (!element) return
    const action = (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/gu, ' ').trim().slice(0, 80)
    if (!action) return
    trackEvent('guided-task-action', {
      mode,
      section: sectionTitle,
      item: itemTitle,
      action,
    })
  }

  return (
    <section ref={headerRef} tabIndex={state === 'completed' ? -1 : undefined} className={`mission-header mission-header-${mode} ${content ? 'mission-header-rich' : ''} mission-header-${state}`} aria-label={`Current ${unit}`}>
      <div className="mission-header-context">
        <span>{sectionTitle} · {progressLabel}</span>
        <strong>{itemTitle}</strong>
        {previouslyCompleted && <b>Previously completed</b>}
      </div>
      <div className="mission-header-objective">
        <span>{state === 'completed' ? 'Task complete' : state === 'question' ? '? Question' : 'Objective'}</span>
        {content ?? <p>{objective}</p>}
        {taskSteps && taskSteps.length > 0 && <ol aria-label="Action checklist">{taskSteps.map((step) => <li key={step}>{step}</li>)}</ol>}
      </div>
      <div className="mission-header-controls">
        <div className="mission-header-actions" onClickCapture={trackActionClick}>{actions}</div>
        {details && <details className="mission-header-details"><summary data-umami-event="guided-task-details" data-umami-event-mode={mode} data-umami-event-section={sectionTitle} data-umami-event-item={itemTitle}>Details &amp; hints</summary><div>{details}</div></details>}
      </div>
    </section>
  )
}
