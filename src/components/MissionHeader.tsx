import type { ReactNode } from 'react'

export type MissionHeaderMode = 'learn' | 'campaign' | 'practice' | 'custom'

interface MissionHeaderProps {
  readonly mode: MissionHeaderMode
  readonly sectionTitle: string
  readonly itemTitle: string
  readonly progressLabel: string
  readonly objective: string
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
  previouslyCompleted = false,
  taskSteps,
  details,
  actions,
}: MissionHeaderProps) {
  const unit = mode === 'learn' ? 'lesson' : 'mission'
  return (
    <section className={`mission-header mission-header-${mode}`} aria-label={`Current ${unit}`}>
      <div className="mission-header-context">
        <span>{sectionTitle} · {progressLabel}</span>
        <strong>{itemTitle}</strong>
        {previouslyCompleted && <b>Previously completed</b>}
      </div>
      <div className="mission-header-objective">
        <span>Objective</span>
        <p>{objective}</p>
        {taskSteps && taskSteps.length > 0 && <ol aria-label="Action checklist">{taskSteps.map((step) => <li key={step}>{step}</li>)}</ol>}
      </div>
      <div className="mission-header-actions">{actions}</div>
      {details && <details className="mission-header-details"><summary>Details &amp; hints</summary><div>{details}</div></details>}
    </section>
  )
}

