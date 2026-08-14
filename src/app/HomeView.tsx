export interface HomeCurrentSession {
  readonly kind: 'lesson' | 'mission'
  readonly title: string
  readonly context?: string
}

export function HomeView({ completed, total, nextTitle, currentSession, onResume, onLearn, onCampaigns, onLab }: {
  readonly completed: number
  readonly total: number
  readonly nextTitle?: string
  readonly onLearn: () => void
  readonly onCampaigns: () => void
  readonly onLab: () => void
  readonly currentSession?: HomeCurrentSession
  readonly onResume?: () => void
}) {
  return <section className="content-screen home-screen" aria-labelledby="home-title">
    <div className="home-hero"><div><p className="eyebrow">A visual modal-logic laboratory</p><h1 id="home-title">Modal Logic Lab - Interactive Kripke Models</h1><p>Build Kripke models, test modal formulas, and see how relations between possible worlds shape necessity and possibility.</p></div></div>
    {currentSession && onResume && <aside className="home-current-session" aria-label="Continue current session"><div><span>Continue where you left off</span><strong>{currentSession.title}</strong>{currentSession.context && <small>{currentSession.context}</small>}</div><button type="button" className="primary-action" onClick={onResume}>Resume {currentSession.kind}</button></aside>}
    <div className="home-actions home-primary-actions" aria-label="Main activities">
      <article className="home-activity-card featured learn-home-entry"><div><span>Guided course</span><h2>Learn</h2><p><strong>{completed}/{total} complete</strong><small>{completed === total ? 'Course complete' : `Next: ${nextTitle ?? 'Learn overview'}`}</small></p></div><button type="button" className="primary-action" aria-label="Start or continue Learn Modal Logic" onClick={onLearn}>LEARN</button></article>
      <article className="home-activity-card"><div><span>Challenges</span><h2>Campaigns</h2><p>Apply modal semantics across longer mission sequences.</p></div><button type="button" className="secondary-button" aria-label="Campaigns: longer challenges and focused practice" onClick={onCampaigns}>Open Campaigns</button></article>
      <article className="home-activity-card"><div><span>Free exploration</span><h2>Lab</h2><p>Experiment with models, formulas, and frame conditions.</p></div><button type="button" className="secondary-button" aria-label="Lab: experiment with models and formulas" onClick={onLab}>Open Lab</button></article>
    </div>
  </section>
}
