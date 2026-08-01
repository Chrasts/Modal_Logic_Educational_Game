import { useState } from 'react'

export function ModalLogicWelcome({ onBegin, onSkip, onBack }: {
  readonly onBegin: () => void
  readonly onSkip: () => void
  readonly onBack: () => void
}) {
  const [mode, setMode] = useState<'possibility' | 'necessity'>('possibility')
  const possibility = mode === 'possibility'
  return <section className="content-screen welcome-screen" aria-labelledby="welcome-title">
    <header className="screen-hero compact">
      <div><p className="eyebrow">Learn Modal Logic · 1</p><h1 id="welcome-title">Welcome to Modal Logic</h1><p className="lead">Reasoning about what is possible, necessary, known, or inevitable.</p></div>
    </header>
    <div className="welcome-grid">
      <article><h2>Beyond ordinary true and false</h2><p>Ordinary propositional logic asks what is true in one situation. Modal logic also studies modes of truth: what may be possible, necessary, known, obligatory, or true in the future. This path begins with possibility and necessity.</p></article>
      <article><h2>Possible worlds as alternatives</h2><p>A world is one possible state or situation. It need not be a whole physical universe: it can represent a system state, an information state, or one possible future.</p></article>
      <article className="welcome-model"><div className="welcome-model-heading"><div><h2>Accessibility</h2><p>An arrow from w0 to another world says that world counts as an accessible alternative from w0. Arrows are directional.</p></div><div className="welcome-switch" role="group" aria-label="Modal explanation"><button type="button" className={possibility ? 'active' : ''} aria-pressed={possibility} onClick={() => setMode('possibility')}>Show possibility</button><button type="button" className={!possibility ? 'active' : ''} aria-pressed={!possibility} onClick={() => setMode('necessity')}>Show necessity</button></div></div>
        <svg viewBox="0 0 540 210" role="img" aria-label="w0 accesses w1 and w2"><defs><marker id="welcome-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" /></marker></defs><path className="welcome-arrow" d="M140 103 C220 52 295 52 370 75" markerEnd="url(#welcome-arrow)" /><path className="welcome-arrow" d="M140 110 C225 163 294 163 370 140" markerEnd="url(#welcome-arrow)" /><g className="welcome-world selected"><circle cx="105" cy="106" r="38" /><text x="105" y="112">w0</text></g><g className={`welcome-world ${possibility ? 'highlight' : ''}`}><circle cx="410" cy="70" r="38" /><text x="410" y="76">w1 · p</text></g><g className={`welcome-world ${!possibility ? 'highlight' : ''}`}><circle cx="410" cy="145" r="38" /><text x="410" y="151">w2 · ¬p</text></g></svg>
        <p className="welcome-explanation">{possibility ? <><code>◇p</code> is true at w0 because accessible w1 satisfies p: it is a witness.</> : <><code>□p</code> is false at w0 because accessible w2 does not satisfy p: it is a counterexample.</>}</p>
      </article>
      <article><h2>Why modal logic matters</h2><p>It supports computer science and program verification, philosophy, reasoning about knowledge and information, temporal reasoning, and linguistics. This learning path focuses on finite Kripke semantics for basic modal logic.</p></article>
      <article className="welcome-cycle"><h2>How the learning path works</h2><ol><li>Read the task.</li><li>Make the requested change.</li><li>Select <strong>Check task</strong>.</li><li>Continue after the task is confirmed.</li></ol><p>Tasks do not complete automatically after an edit.</p></article>
    </div>
    <div className="welcome-actions"><button type="button" className="primary-action" onClick={onBegin}>Begin with the controls</button><button type="button" className="secondary-button" onClick={onSkip}>Skip introduction</button><button type="button" className="text-button" onClick={onBack}>Back to Learn</button></div>
  </section>
}
