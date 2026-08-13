import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useAnalyticsView } from '../analytics'
import type { CampaignTrack } from '../campaign'
import type { GuidedCampaign } from '../guided-campaigns'

export type CampaignSection = 'challenges' | 'practice'

function handleTabKeys(event: ReactKeyboardEvent<HTMLElement>, current: CampaignSection, onChange: (section: CampaignSection) => void) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const order: readonly CampaignSection[] = ['challenges', 'practice']
  const index = order.indexOf(current)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : event.key === 'ArrowLeft' ? (index + 1) % 2 : (index + 1) % 2
  onChange(order[next])
  requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus())
}

interface CampaignsViewProps {
  readonly section: CampaignSection
  readonly guidedCampaigns: readonly GuidedCampaign[]
  readonly practiceTracks: readonly CampaignTrack[]
  readonly selectedTrackIndex: number
  readonly completedLevelIds: ReadonlySet<string>
  readonly overallPracticeCompleted: number
  readonly overallPracticeLevels: number
  readonly activePracticeTrackIndex: number
  readonly activePracticeLevelIndex: number
  readonly practiceSessionActive: boolean
  readonly onSectionChange: (section: CampaignSection) => void
  readonly onOpenLearn: () => void
  readonly onStartCampaign: (index: number) => void
  readonly onSelectPracticeTrack: (index: number) => void
  readonly onStartPractice: (levelIndex: number, trackIndex: number) => void
  readonly onResumePractice: () => void
}

export function CampaignsView({ section, guidedCampaigns, practiceTracks, selectedTrackIndex, completedLevelIds, overallPracticeCompleted, overallPracticeLevels, activePracticeTrackIndex, activePracticeLevelIndex, practiceSessionActive, onSectionChange, onOpenLearn, onStartCampaign, onSelectPracticeTrack, onStartPractice, onResumePractice }: CampaignsViewProps) {
  useAnalyticsView('campaigns')
  const selectedTrack = practiceTracks[selectedTrackIndex] ?? practiceTracks[0]
  const selectedCompleted = selectedTrack.levels.filter((level) => completedLevelIds.has(level.id)).length
  const nextLevelIndex = selectedTrack.levels.findIndex((level) => !completedLevelIds.has(level.id))

  return <section className="content-screen campaign-screen" aria-labelledby="campaign-screen-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Challenges and practice</p><h1 id="campaign-screen-title">Campaigns</h1><p>Choose longer challenges or focused practice collections.</p><div className="learn-callout"><strong>New to modal logic?</strong><button type="button" className="secondary-button" onClick={onOpenLearn}>Open Learn</button></div></div></div>
    <div className="campaign-section-tabs" role="tablist" aria-label="Campaign sections" onKeyDown={(event) => handleTabKeys(event, section, onSectionChange)}>
      {([['challenges', 'General Challenges'], ['practice', 'Practice Library']] as const).map(([value, label]) => <button key={value} type="button" role="tab" tabIndex={section === value ? 0 : -1} aria-selected={section === value} aria-controls={`campaign-${value}`} className={section === value ? 'active' : ''} onClick={() => onSectionChange(value)}>{label}</button>)}
    </div>
    {section === 'challenges' && <section className="campaign-block" id="campaign-challenges" role="tabpanel" aria-labelledby="challenges-block-title"><div className="track-heading"><div><p className="eyebrow">Longer guided campaigns</p><h2 id="challenges-block-title">General Challenges</h2><p>Combine skills after completing the corresponding introductory ideas. Recommendations are not locks.</p></div></div><div className="learn-chapter-list">{guidedCampaigns.map((campaign, index) => { const completed = campaign.levels.filter((level) => completedLevelIds.has(level.id)).length; return <article className={completed === campaign.levels.length ? 'complete' : ''} key={campaign.id}><div><p className="eyebrow">Recommended after: {campaign.recommendedAfter}</p><h3>{campaign.title}</h3><p>{campaign.description}</p><small>{completed}/{campaign.levels.length} missions · {campaign.difficulty} · {campaign.estimatedTime}</small></div><button type="button" className="primary-action" onClick={() => onStartCampaign(index)}>{completed === campaign.levels.length ? 'Replay campaign' : completed ? 'Continue campaign' : 'Start campaign'}</button></article> })}</div></section>}
    {section === 'practice' && <section className="campaign-block" id="campaign-practice" role="tabpanel" aria-labelledby="practice-block-title">
      <div className="track-heading"><div><p className="eyebrow">Non-linear targeted exercises</p><h2 id="practice-block-title">Practice Library</h2><p>Select a collection, then choose any mission without leaving Campaigns.</p></div><div className="collection-progress"><strong>{overallPracticeCompleted}/{overallPracticeLevels}</strong><span>practice missions complete</span></div></div>
      <div className="campaign-browser">
        <aside className="track-list" aria-label="Practice collection list">{practiceTracks.map((track, index) => { const completed = track.levels.filter((level) => completedLevelIds.has(level.id)).length; return <button type="button" className={selectedTrackIndex === index ? 'active' : ''} aria-pressed={selectedTrackIndex === index} onClick={() => onSelectPracticeTrack(index)} key={track.id}><strong>{track.title}</strong><span>{completed}/{track.levels.length} complete</span></button> })}</aside>
        <div className="track-detail"><div className="track-heading"><div><p className="eyebrow">Practice collection · {selectedCompleted}/{selectedTrack.levels.length} complete</p><h3>{selectedTrack.title}</h3><p>{selectedTrack.description}</p></div><button type="button" className="primary-action" onClick={() => onStartPractice(nextLevelIndex < 0 ? 0 : nextLevelIndex, selectedTrackIndex)}>{selectedCompleted === 0 ? 'Start practice' : selectedCompleted === selectedTrack.levels.length ? 'Replay collection' : 'Continue practice'}</button></div><div className="level-browser">{selectedTrack.levels.map((level, index) => <article className={completedLevelIds.has(level.id) ? 'complete' : ''} key={level.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{level.title}</h4><p>{level.concept}</p></div><b>{completedLevelIds.has(level.id) ? 'Complete' : 'Not completed'}</b><button type="button" onClick={() => practiceSessionActive && activePracticeTrackIndex === selectedTrackIndex && activePracticeLevelIndex === index ? onResumePractice() : onStartPractice(index, selectedTrackIndex)}>{practiceSessionActive && activePracticeTrackIndex === selectedTrackIndex && activePracticeLevelIndex === index ? 'Resume' : completedLevelIds.has(level.id) ? 'Replay' : 'Practice'}</button></article>)}</div></div>
      </div>
    </section>}
  </section>
}
