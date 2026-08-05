import type { ReactNode } from 'react'
import { authorSteps, AuthorStepNavigation } from './AuthorStepNavigation'

export function MissionAuthorStepper({ currentStep, visitedSteps, errors, onBack, onNext, onSelectStep, children }: {
  readonly currentStep: number
  readonly visitedSteps: ReadonlySet<number>
  readonly errors: readonly string[]
  readonly onBack: () => void
  readonly onNext: () => void
  readonly onSelectStep: (step: number) => void
  readonly children: ReactNode
}) {
  return <div className="mission-author-stepper">
    <AuthorStepNavigation currentStep={currentStep} visitedSteps={visitedSteps} onSelectStep={onSelectStep} />
    <section className="author-step" aria-labelledby="author-step-title">
      <p className="eyebrow">Step {currentStep} of {authorSteps.length}</p>
      <h4 id="author-step-title">{authorSteps[currentStep - 1]}</h4>
      {errors.length > 0 && <div className="author-step-errors" role="alert"><strong>Fix before continuing:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      {children}
      <footer className="author-step-actions">
        <button type="button" className="secondary-button" onClick={onBack} disabled={currentStep === 1}>Back</button>
        {currentStep < authorSteps.length && <button type="button" className="primary-action" onClick={onNext}>Next</button>}
      </footer>
    </section>
  </div>
}
