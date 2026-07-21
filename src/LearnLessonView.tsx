import type { LearnLesson, LearnStage } from './learn'

const stageLabels: Record<LearnStage, string> = {
  concept: 'Concept', example: 'Worked example', prediction: 'Prediction', task: 'Task', feedback: 'Feedback', transfer: 'Transfer', completion: 'Complete',
}

export function LearnLessonView({ lesson, stage, predictionAnswer, predictionMessage, exampleStep, onStage, onPrediction, onExampleStep, onBeginTask, onBack }: {
  readonly lesson: LearnLesson
  readonly stage: LearnStage
  readonly predictionAnswer: string
  readonly predictionMessage?: string
  readonly exampleStep: number
  readonly onStage: (stage: LearnStage) => void
  readonly onPrediction: (answer: string) => void
  readonly onExampleStep: (step: number) => void
  readonly onBeginTask: () => void
  readonly onBack: () => void
}) {
  const prediction = lesson.task.prediction
  const visibleStages = lesson.stages
  const example = lesson.workedExample
  return <section className="content-screen learn-lesson-screen" aria-labelledby="learn-lesson-title">
    <header className="lesson-header"><button type="button" className="text-button" onClick={onBack}>← Course</button><p className="eyebrow">{lesson.chapterId} · guided lesson</p><h1 id="learn-lesson-title">{lesson.title}</h1><p>{lesson.learningObjective}</p></header>
    <nav className="lesson-stage-nav" aria-label="Lesson stages">{visibleStages.map((item) => <button key={item} type="button" className={stage === item ? 'active' : ''} onClick={() => onStage(item)}>{stageLabels[item]}</button>)}</nav>
    {stage === 'concept' && <article className="lesson-card concept-card"><p className="eyebrow">Core idea</p><h2>{lesson.concept.heading}</h2><p className="lead">{lesson.concept.intuitive}</p>{lesson.concept.formal && <p className="formal-rule">{lesson.concept.formal}</p>}<ul>{lesson.concept.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>{lesson.concept.warning && <p className="lesson-warning">Watch for this: {lesson.concept.warning}</p>}<button className="primary-action" type="button" onClick={() => onStage(example ? 'example' : prediction ? 'prediction' : 'task')}>Continue</button></article>}
    {stage === 'example' && example && <article className="lesson-card example-card"><p className="eyebrow">Worked example · {example.formula} at {example.evaluationWorld}</p><div className="example-model"><div className="example-worlds">{example.worlds.map((world) => <span className={world.id === example.evaluationWorld ? 'evaluation-world' : ''} key={world.id}><b>{world.id}</b><small>{world.atoms || '∅'}</small></span>)}</div><p className="example-edges">{example.edges.map(({ from, to }) => `${from} → ${to}`).join(' · ')}</p></div><p className="example-step"><b>Step {exampleStep + 1}.</b> {example.steps[exampleStep]}</p><div className="lesson-actions"><button type="button" className="secondary-button" disabled={exampleStep === 0} onClick={() => onExampleStep(exampleStep - 1)}>Previous step</button><button type="button" className="primary-action" onClick={() => exampleStep + 1 < example.steps.length ? onExampleStep(exampleStep + 1) : onStage(prediction ? 'prediction' : 'task')}>{exampleStep + 1 < example.steps.length ? 'Next step' : 'Continue'}</button></div></article>}
    {stage === 'prediction' && prediction && <article className="lesson-card prediction-card"><p className="eyebrow">Predict before testing</p><h2>{prediction.prompt}</h2>{prediction.kind === 'truth' ? <div className="choice-row"><button className={predictionAnswer === 'true' ? 'selected' : ''} type="button" onClick={() => onPrediction('true')}>True</button><button className={predictionAnswer === 'false' ? 'selected' : ''} type="button" onClick={() => onPrediction('false')}>False</button></div> : prediction.kind === 'world-choice' ? <div className="choice-row">{prediction.worldChoices?.map((choice) => <button className={predictionAnswer === choice ? 'selected' : ''} type="button" key={choice} onClick={() => onPrediction(choice)}>{choice}</button>)}</div> : <div className="choice-row">{prediction.modelChoices?.map((choice) => <button className={predictionAnswer === choice.id ? 'selected' : ''} type="button" key={choice.id} onClick={() => onPrediction(choice.id)}>Model {choice.id}</button>)}</div>} {predictionMessage && <p className="prediction-message">{predictionMessage}</p>}<button className="primary-action" type="button" disabled={!predictionAnswer} onClick={() => onStage('task')}>Continue to task</button></article>}
    {stage === 'task' && <article className="lesson-card task-card"><p className="eyebrow">Build and verify</p><h2>{lesson.task.instruction}</h2><p>Open the workspace when you are ready. You can return to the concept at any time.</p><button className="primary-action" type="button" onClick={onBeginTask}>Open workspace</button></article>}
    {stage === 'feedback' && <article className="lesson-card feedback-card"><p className="eyebrow">Task complete</p><h2>What this shows</h2><p className="lead">{lesson.successExplanation}</p>{lesson.commonMistake && <p className="lesson-warning">Common mistake: {lesson.commonMistake}</p>}<div className="lesson-actions"><button className="secondary-button" type="button" onClick={() => onStage('concept')}>Review concept</button><button className="primary-action" type="button" onClick={() => onStage(lesson.transferTask ? 'transfer' : 'completion')}>{lesson.transferTask ? 'Optional transfer' : 'Finish lesson'}</button></div></article>}
    {stage === 'transfer' && lesson.transferTask && <article className="lesson-card task-card"><p className="eyebrow">Optional transfer</p><h2>{lesson.transferTask.instruction}</h2><p>This is optional: it extends the same idea without changing your lesson completion.</p><button className="primary-action" type="button" onClick={onBeginTask}>Try transfer task</button><button className="text-button" type="button" onClick={() => onStage('completion')}>Skip for now</button></article>}
    {stage === 'completion' && <article className="lesson-card feedback-card"><p className="eyebrow">Lesson complete</p><h2>{lesson.title}</h2><p>{lesson.successExplanation}</p><button className="primary-action" type="button" onClick={onBack}>Return to course</button></article>}
  </section>
}
