import { useEffect, useState } from 'react'
import type { WorkedExample } from '../learn'
import { StaticKripkeDiagram } from '../components/StaticKripkeDiagram'

export function WorkedExampleCard({ lessonId, example }: { readonly lessonId: string; readonly example: WorkedExample }) {
  const [step, setStep] = useState(0)
  useEffect(() => setStep(0), [lessonId])
  return <article className="worked-example-card">
    <h3>Worked example</h3>
    <div className="worked-example-meta"><code>{example.formula}</code><span>Evaluation world: <b>{example.evaluationWorld}</b></span></div>
    <StaticKripkeDiagram worlds={example.worlds} edges={example.edges} evaluationWorld={example.evaluationWorld} compact ariaLabel={`Worked example for ${example.formula}`} />
    <p role="status"><strong>Step {step + 1} of {example.steps.length}.</strong> {example.steps[step]}</p>
    <div><button type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>Previous</button><button type="button" disabled={step === example.steps.length - 1} onClick={() => setStep((current) => current + 1)}>Next</button></div>
  </article>
}
