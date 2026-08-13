import type { GameLevel } from '../campaign'
import type { FramePropertyName } from '../logic'
import { trackEvent } from '../analytics'
import { StaticKripkeDiagram } from './StaticKripkeDiagram'

type Prediction = NonNullable<GameLevel['prediction']>

export const supportedPredictionKinds = {
  truth: true,
  'world-choice': true,
  'counterexample-world': true,
  'frame-property': true,
  countervaluation: true,
  'model-choice': true,
  'statement-choice': true,
  'scope-truth': true,
} as const satisfies Record<Prediction['kind'], true>

interface PredictionInputProps {
  readonly prediction: Prediction
  readonly answer: string
  readonly onAnswer: (answer: string) => void
  readonly scope?: GameLevel['scope']
  readonly availableWorldIds?: readonly string[]
  readonly propertyChoices?: readonly FramePropertyName[]
  readonly worldSelectionMode?: 'map' | 'control'
}

export function PredictionInput({ prediction, answer, onAnswer, scope = 'pointed', availableWorldIds = [], propertyChoices = [], worldSelectionMode = 'control' }: PredictionInputProps) {
  const scopeAnswers = answer.split(',')
  const recordAnswer = (value: string) => {
    trackEvent('prediction-choice', { kind: prediction.kind, choice: value })
    onAnswer(value)
  }
  const setScopeAnswer = (index: number, value: string) => {
    const next = [...scopeAnswers]
    next[index] = value
    trackEvent('prediction-choice', { kind: prediction.kind, choice: `${index + 1}:${value}` })
    onAnswer([0, 1, 2].map((key) => next[key] ?? '').join(','))
  }
  const worldChoices = prediction.worldChoices ?? availableWorldIds
  const relationChoices = prediction.propertyChoices ?? propertyChoices
  const truthLabels = scope === 'frame'
    ? [['true', 'Valid on this frame'], ['false', 'Not valid on this frame']] as const
    : [['true', 'True'], ['false', 'False']] as const

  if (prediction.kind === 'world-choice' || prediction.kind === 'counterexample-world') {
    if (worldSelectionMode === 'map') return <div className="map-answer-status" role="status"><span>Select a world in the model.</span><b>Selected world: {answer || 'None'}</b></div>
    return <select aria-label={prediction.kind === 'world-choice' ? 'Witness world answer' : 'Predicted counterexample world'} value={answer} onChange={(event) => recordAnswer(event.target.value)}><option value="">Select a world</option>{worldChoices.map((id) => <option key={id}>{id}</option>)}</select>
  }
  if (prediction.kind === 'truth') return <div className="question-choice-row prediction-choice" role="radiogroup" aria-label="Truth answer">{truthLabels.map(([value, label]) => <button type="button" role="radio" aria-checked={answer === value} className={answer === value ? 'active' : ''} key={value} onClick={() => recordAnswer(value)}>{label}</button>)}</div>
  if (prediction.kind === 'scope-truth') return <div className="scope-prediction question-scope-choice" aria-label="Scope truth answer">{(['Pointed', 'Model-global', 'Frame-valid'] as const).map((label, index) => <div key={label}><span>{label}</span><button type="button" className={scopeAnswers[index] === 'true' ? 'active' : ''} aria-pressed={scopeAnswers[index] === 'true'} onClick={() => setScopeAnswer(index, 'true')}>True</button><button type="button" className={scopeAnswers[index] === 'false' ? 'active' : ''} aria-pressed={scopeAnswers[index] === 'false'} onClick={() => setScopeAnswer(index, 'false')}>False</button></div>)}</div>
  if (prediction.kind === 'frame-property') return <select aria-label="Relational property answer" value={answer} onChange={(event) => recordAnswer(event.target.value)}><option value="">Select a property</option>{relationChoices.map((property) => <option key={property}>{property}</option>)}</select>
  if (prediction.kind === 'countervaluation') return <div className="countervaluation-choices" role="radiogroup" aria-label="Countervaluation answer">{prediction.countervaluationChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice.id} className={answer === choice.id ? 'active' : ''} key={choice.id} onClick={() => recordAnswer(choice.id)}><b>{choice.id}</b>{Object.entries(choice.valuation).map(([world, atoms]) => <code key={world}>{world}: {atoms.length ? `{${atoms.join(', ')}}` : '∅'}</code>)}</button>)}</div>
  if (prediction.kind === 'statement-choice') return <div className="statement-choice-grid" role="radiogroup" aria-label="Statement answer">{prediction.statementChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice.id} className={answer === choice.id ? 'active' : ''} key={choice.id} onClick={() => recordAnswer(choice.id)}>{choice.label}</button>)}</div>
  return <div className="model-choice-grid" role="radiogroup" aria-label="Candidate model answer">{prediction.modelChoices?.map((choice) => <button type="button" role="radio" aria-checked={answer === choice.id} className={answer === choice.id ? 'active' : ''} key={choice.id} onClick={() => recordAnswer(choice.id)}><strong>Model {choice.id}</strong><StaticKripkeDiagram worlds={choice.worlds} edges={choice.edges} evaluationWorld={choice.evaluationWorld} compact ariaLabel={`Candidate model ${choice.id}`} /><span>Evaluation: {choice.evaluationWorld}</span><span className="visually-hidden">{choice.worlds.map((world) => `${world.id}: ${world.atoms.trim() || 'no atoms'}`).join('; ')}. R = {choice.edges.length ? choice.edges.map(({ from, to }) => `${from} to ${to}`).join(', ') : 'none'}.</span></button>)}</div>
}
