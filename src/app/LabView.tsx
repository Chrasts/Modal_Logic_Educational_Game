import { trackEvent, useAnalyticsView } from '../analytics'

const modelSandboxCapabilities = [
  'Build finite Kripke models',
  'Evaluate modal formulas',
  'Compare formulas',
  'Explore frame properties',
  'Inspect evaluation traces',
] as const

export function LabView({ onOpenModelSandbox }: { readonly onOpenModelSandbox: () => void }) {
  useAnalyticsView('lab')
  const openModelSandbox = () => {
    trackEvent('activity_start', { area: 'lab', activity: 'model_sandbox' })
    onOpenModelSandbox()
  }
  return <section className="content-screen lab-screen" aria-labelledby="lab-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Experiment freely</p><h1 id="lab-title" className="clean-display">Lab</h1><p>Explore finite Kripke models and modal formulas without a fixed mission objective. Lab tools share the same deterministic model workspace used throughout the game.</p></div></div>
    <div className="lab-tool-grid" aria-label="Available Lab tools">
      <article className="lab-tool-card active"><div><p className="eyebrow">Available now</p><h2>Model Sandbox</h2><p>Build and edit finite Kripke models, evaluate formulas, compare formulas, and explore frame properties.</p></div><ul>{modelSandboxCapabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul><button type="button" className="primary-action" onClick={openModelSandbox}>Open Model Sandbox</button></article>
    </div>
  </section>
}
