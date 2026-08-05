export const authorSteps = [
  'Learning objective',
  'Initial model',
  'Formula and scope',
  'Editable controls',
  'Constraints',
  'Prediction',
  'Reference solution',
  'Preview and validation',
  'Export/share',
] as const

export interface AuthorStepNavigationProps {
  readonly currentStep: number
  readonly visitedSteps: ReadonlySet<number>
  readonly onSelectStep: (step: number) => void
}

export function AuthorStepNavigation({ currentStep, visitedSteps, onSelectStep }: AuthorStepNavigationProps) {
  return (
    <nav aria-label="Mission authoring steps">
      <ol className="author-step-navigation">
        {authorSteps.map((label, index) => {
          const step = index + 1
          const enabled = step === currentStep || visitedSteps.has(step)
          return <li key={label} className={step === currentStep ? 'current' : visitedSteps.has(step) ? 'visited' : ''}>
            <button type="button" aria-current={step === currentStep ? 'step' : undefined} disabled={!enabled} onClick={() => onSelectStep(step)}>
              <span>{step}</span>{label}
            </button>
          </li>
        })}
      </ol>
    </nav>
  )
}
