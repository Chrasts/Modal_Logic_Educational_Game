import { useAnalyticsView } from '../analytics'

export function HomeView({ completed, total, nextTitle, onLearn, onCampaigns, onLab, onProfile, onSettings, onData }: {
  readonly completed: number
  readonly total: number
  readonly nextTitle?: string
  readonly onLearn: () => void
  readonly onCampaigns: () => void
  readonly onLab: () => void
  readonly onProfile: () => void
  readonly onSettings: () => void
  readonly onData: () => void
}) {
  useAnalyticsView('home')
  return <section className="content-screen home-screen" aria-labelledby="home-title">
    <div className="home-hero"><div><p className="eyebrow">A visual modal-logic laboratory</p><h1 id="home-title">Logic Model Builder</h1><p>Build Kripke models, test modal formulas, and see how relations between possible worlds shape necessity and possibility. Made for learning, teaching, and exploring formal reasoning.</p></div></div>
    <div className="home-actions home-primary-actions" aria-label="Main menu">
      <div className="learn-home-entry"><button type="button" className="home-menu-tile featured learn-home-tile" aria-label="Start or continue Learn Modal Logic" onClick={onLearn}><strong>LEARN</strong></button><p className="learn-home-status"><strong>{completed}/{total} complete</strong><span>{completed === total ? 'Course complete' : `Next: ${nextTitle ?? 'Learn overview'}`}</span></p></div>
      <button type="button" className="home-menu-tile" aria-label="Campaigns: longer challenges and focused practice" onClick={onCampaigns}><strong>CAMPAIGNS</strong></button>
      <button type="button" className="home-menu-tile" aria-label="Lab: experiment with models and formulas" onClick={onLab}><strong>LAB</strong></button>
    </div>
    <div className="home-secondary"><button type="button" aria-label="Open profile from home" onClick={onProfile}><strong>Profile</strong></button><button type="button" aria-label="Open settings from home" onClick={onSettings}><strong>Settings</strong></button><button type="button" aria-label="Open data manager from home" onClick={onData}><strong>Data</strong></button></div>
  </section>
}
