import { useState } from 'react'
import { SectionTabs } from './SectionTabs'

type HelpSection = 'workspace' | 'objectives' | 'results' | 'data'
const sections: readonly [HelpSection, string][] = [['workspace', 'Workspace controls'], ['objectives', 'Objectives & constraints'], ['results', 'Results'], ['data', 'Local data']]

export function HelpView({ hasCurrentMission, onReturnToMission, onReplayWelcome, onReplayControls, onReplayTour }: {
  readonly hasCurrentMission: boolean
  readonly onReturnToMission: () => void
  readonly onReplayWelcome: () => void
  readonly onReplayControls: () => void
  readonly onReplayTour: () => void
}) {
  const [section, setSection] = useState<HelpSection>('workspace')
  return <section className="content-screen guide-screen" aria-labelledby="help-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Application manual</p><h1 id="help-title" className="clean-display">Help &amp; Controls</h1><p>How to operate the workspace, edit models, understand objectives, and inspect verification results.</p></div>{hasCurrentMission && <button type="button" onClick={onReturnToMission}>Return to current mission</button>}</div>
    <div className="guide-actions"><button type="button" onClick={onReplayControls}>Replay Learn the Controls</button><button type="button" onClick={onReplayTour}>Replay workspace tour</button><button type="button" onClick={onReplayWelcome}>Replay Welcome</button></div>
    <SectionTabs label="Help sections" sections={sections} value={section} onChange={setSection} />
    <div className="guide-page-grid">
      {section === 'workspace' && <><article><h2>Select and edit worlds</h2><p>Click a world to select it. When permitted, edit its name and true atoms, or type an atom directly after selection.</p></article><article><h2>Model editing</h2><p>Use + World, drag relations from their source to destination, and select explicit relations before deleting them. Undo and Redo preserve ordinary editing history.</p></article><article><h2>Map navigation</h2><p>Drag empty space to pan. Mouse wheel zooms. Precision touchpad scrolling uses every X/Y delta supplied by the browser. Pinch zooms without zooming the page.</p></article><article><h2>Workspace layout</h2><p>Drag the vertical separators to resize desktop side panels. Arrow keys resize a focused separator. Shift uses a larger step.</p></article></>}
      {section === 'objectives' && <><article><h2>Objective scopes</h2><p>Tasks may check pointed, model-global, finite-frame, correspondence, or construction objectives.</p></article><article><h2>Construction constraints</h2><p>Missions can visibly bound size, require or forbid atoms and relations, and require frame properties.</p></article><article><h2>Locked inputs</h2><p>Guided tasks expose only the parts of the workspace that may be changed.</p></article></>}
      {section === 'results' && <><article><h2>Immediate result</h2><p>After Check task, the result panel clearly reports Objective met, Not yet, or Verification error.</p></article><article><h2>Semantic details</h2><p>Expand Semantic details to inspect truth by world, countervaluations, diagnostics, and the evaluation tree.</p></article><article><h2>Progressive feedback</h2><p>Early failures stay concise. Repeated attempts reveal more targeted recovery information.</p></article></>}
      {section === 'data' && <><article><h2>Local persistence</h2><p>Model Sandbox, progress, settings, and desktop panel widths are stored locally in this browser.</p></article><article><h2>Import and export</h2><p>The Data area exports or imports versioned model JSON and can reset Model Sandbox or learning progress independently.</p></article></>}
    </div>
  </section>
}
