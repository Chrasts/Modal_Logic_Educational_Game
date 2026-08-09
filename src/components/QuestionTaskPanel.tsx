import type { GameLevel } from '../campaign'

interface QuestionTaskPanelProps {
  readonly level: GameLevel
  readonly answer: string
  readonly feedback?: { readonly correct: boolean; readonly detail: string }
  readonly onAnswer: (answer: string) => void
}

export function QuestionTaskPanel({ level, answer, feedback, onAnswer }: QuestionTaskPanelProps) {
  const question = level.prediction
  if (!question) return null
  const mapAnswer = question.kind === 'world-choice' || question.kind === 'counterexample-world'
  const scopeAnswers = answer.split(',')
  const setScopeAnswer = (index: number, value: string) => {
    const next = [...scopeAnswers]
    next[index] = value
    onAnswer([0, 1, 2].map((key) => next[key] ?? '').join(','))
  }
  const truthLabels = level.scope === 'frame'
    ? [['true', 'Valid on this frame'], ['false', 'Not valid on this frame']] as const
    : [['true', 'True'], ['false', 'False']] as const
  return (
    <div className="question-task-panel">
      <strong>{question.prompt}</strong>
      {mapAnswer ? <div className="map-answer-status" role="status"><span>Select a world on the map.</span><b>Selected world: {answer || 'None'}</b></div>
        : question.kind === 'truth' ? <div className="question-choice-row" role="radiogroup" aria-label="Truth answer">{truthLabels.map(([value, label]) => <button type="button" role="radio" aria-checked={answer === value} className={answer === value ? 'active' : ''} key={value} onClick={() => onAnswer(value)}>{label}</button>)}</div>
          : question.kind === 'countervaluation' ? <div className="countervaluation-choices" role="radiogroup" aria-label="Countervaluation answer">{question.countervaluationChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice.id} className={answer === choice.id ? 'active' : ''} key={choice.id} onClick={() => onAnswer(choice.id)}><b>{choice.id}</b>{Object.entries(choice.valuation).map(([world, atoms]) => <code key={world}>{world}: {atoms.length ? `{${atoms.join(', ')}}` : '∅'}</code>)}</button>)}</div>
            : question.kind === 'statement-choice' ? <div className="statement-choice-grid" role="radiogroup" aria-label="Statement answer">{question.statementChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice.id} className={answer === choice.id ? 'active' : ''} key={choice.id} onClick={() => onAnswer(choice.id)}>{choice.label}</button>)}</div>
              : question.kind === 'frame-property' ? <div className="question-choice-row" role="radiogroup" aria-label="Relational property answer">{question.propertyChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice} className={answer === choice ? 'active' : ''} key={choice} onClick={() => onAnswer(choice)}>{choice}</button>)}</div>
                : question.kind === 'scope-truth' ? <div className="scope-prediction question-scope-choice" aria-label="Scope truth answer">{(['Pointed', 'Model-global', 'Frame-valid'] as const).map((label, index) => <div key={label}><span>{label}</span><button type="button" className={scopeAnswers[index] === 'true' ? 'active' : ''} aria-pressed={scopeAnswers[index] === 'true'} onClick={() => setScopeAnswer(index, 'true')}>True</button><button type="button" className={scopeAnswers[index] === 'false' ? 'active' : ''} aria-pressed={scopeAnswers[index] === 'false'} onClick={() => setScopeAnswer(index, 'false')}>False</button></div>)}</div>
                  : question.kind === 'model-choice' ? <div className="model-choice-grid" role="radiogroup" aria-label="Candidate model answer">{question.modelChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice.id} className={answer === choice.id ? 'active' : ''} key={choice.id} onClick={() => onAnswer(choice.id)}><strong>Model {choice.id}</strong><span>Evaluation: {choice.evaluationWorld}</span><div>{choice.worlds.map((world) => <code key={world.id}>{world.id}: {world.atoms.trim() ? `{${world.atoms.split(/[\s,]+/u).filter(Boolean).join(', ')}}` : '∅'}</code>)}</div><small>R = {choice.edges.length ? `{${choice.edges.map(({ from, to }) => `(${from},${to})`).join(', ')}}` : '∅'}</small></button>)}</div>
                    : null}
      {feedback && <p className={feedback.correct ? 'question-feedback correct' : 'question-feedback incorrect'} role={feedback.correct ? 'status' : 'alert'}><b>{feedback.correct ? 'Correct.' : 'Not quite.'}</b> {feedback.detail}</p>}
    </div>
  )
}
