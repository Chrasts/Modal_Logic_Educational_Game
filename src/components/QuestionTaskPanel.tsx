import type { GameLevel } from '../campaign'
import { PredictionInput } from './PredictionInput'

interface QuestionTaskPanelProps {
  readonly level: GameLevel
  readonly answer: string
  readonly feedback?: { readonly correct: boolean; readonly detail: string }
  readonly onAnswer: (answer: string) => void
}

export function QuestionTaskPanel({ level, answer, feedback, onAnswer }: QuestionTaskPanelProps) {
  const question = level.prediction
  if (!question) return null
  return (
    <div className="question-task-panel">
      <strong>{question.prompt}</strong>
      <PredictionInput prediction={question} answer={answer} onAnswer={onAnswer} scope={level.scope} availableWorldIds={level.worlds.map(({ id }) => id)} worldSelectionMode="map" />
      {feedback && <p className={feedback.correct ? 'question-feedback correct' : 'question-feedback incorrect'} role={feedback.correct ? 'status' : 'alert'}><b>{feedback.correct ? 'Correct.' : 'Not quite.'}</b> {feedback.detail}</p>}
    </div>
  )
}
