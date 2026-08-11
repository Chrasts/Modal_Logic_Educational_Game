import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { StaticKripkeDiagram } from '../components/StaticKripkeDiagram'

export type GuideTab = 'overview' | 'theory' | 'operators' | 'scopes' | 'relations' | 'objectives' | 'controls' | 'glossary'

function MapControlsReference({ onReplayTour }: { readonly onReplayTour: () => void }) {
  return <>
    <article><h2>Select and edit worlds</h2><p>Click a world to select it and focus its incoming and outgoing relations. Use the model panel to rename it, change its true atoms, or make it the evaluation world when the task permits.</p></article>
    <article><h2>Add and position worlds</h2><p>Use + World for a collision-aware position near the selected world or viewport centre. On desktop, double-click empty map space to create one world without zooming. Dragging may intentionally overlap worlds; Tidy model is the explicit recovery action.</p></article>
    <article><h2>Relations</h2><p>Start dragging on the world where the arrow begins and release on its destination; any of the four connection points works and handle position does not determine direction. You can also use Accessibility. A self-loop wRw appears only as ↻ on its world: solid is explicit and dashed is derived. A two-way relation is one ↔ line; click it to expose each direction. Only explicit directions can be selected and deleted.</p></article>
    <article><h2>Move around the map</h2><p>Drag empty space to pan. A mouse wheel zooms under the pointer; two-finger touchpad scrolling pans freely in X and Y; pinch zooms. Zoom in, Zoom out, and Fit model are available in the map toolbar.</p></article>
    <article><h2>Tidy and Fit</h2><p>Tidy model organizes the explicit construction as one undoable step; enforced derived relations are redrawn over that layout. Fit model changes only the viewport and never enters model history.</p></article>
    <article className="guide-action-card"><h2>Workspace tour</h2><p>Replay the short overlay without resetting the current mission, model, or progress.</p><button type="button" className="secondary-button" onClick={onReplayTour}>Replay workspace tour</button></article>
  </>
}

function handleTabKeys(event: ReactKeyboardEvent<HTMLElement>, order: readonly GuideTab[], current: GuideTab, onChange: (tab: GuideTab) => void) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = Math.max(0, order.indexOf(current))
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : event.key === 'ArrowLeft' ? (index - 1 + order.length) % order.length : (index + 1) % order.length
  onChange(order[next])
  requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus())
}

interface GuideViewProps {
  readonly tab: GuideTab
  readonly hasCurrentMission: boolean
  readonly onTabChange: (tab: GuideTab) => void
  readonly onReturnToMission: () => void
  readonly onReplayWelcome: () => void
  readonly onReplayControls: () => void
  readonly onReplayTour: () => void
  readonly onOpenLearn: () => void
  readonly onOpenSandbox: () => void
}

export function GuideView({ tab, hasCurrentMission, onTabChange, onReturnToMission, onReplayWelcome, onReplayControls, onReplayTour, onOpenLearn, onOpenSandbox }: GuideViewProps) {
  const activeTabs: readonly (readonly [GuideTab, string])[] = tab === 'objectives' || tab === 'controls'
    ? [['controls', 'Controls'], ['objectives', 'Objectives & constraints']]
    : [['theory', 'Frames & models'], ['operators', 'Box & diamond'], ['scopes', 'Semantic scopes'], ['relations', 'Relations & axioms'], ['glossary', 'Glossary']]
  return <section className="content-screen guide-screen" aria-labelledby="guide-screen-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Reference manual</p><h1 id="guide-screen-title" className="clean-display">Modal Logic Guide</h1><p>Look up formal Kripke semantics, modal operators, objectives, relations, controls, and terminology. Guided teaching remains in Learn.</p></div>{hasCurrentMission && <button type="button" className="secondary-button" onClick={onReturnToMission}>Return to current mission</button>}</div>
    <div className="guide-actions"><button type="button" className="secondary-button" onClick={onReplayWelcome}>Replay Welcome to Modal Logic</button><button type="button" className="secondary-button" onClick={onReplayControls}>Replay Learn the Controls</button><button type="button" className="secondary-button" onClick={onReplayTour}>Replay workspace tour</button><button type="button" className="secondary-button" onClick={onOpenLearn}>Open Learn</button><button type="button" className="secondary-button" onClick={onOpenSandbox}>Try in Sandbox</button></div>
    {tab !== 'overview' && <div className="guide-local-nav"><button type="button" className="guide-overview-back" onClick={() => onTabChange('overview')}>← Guide overview</button><div className="guide-path-label">{tab === 'objectives' || tab === 'controls' ? 'How to play' : 'Formal semantics'}</div></div>}
    {tab !== 'overview' && <div className="guide-tabs" role="tablist" aria-label="Guide sections" onKeyDown={(event) => handleTabKeys(event, activeTabs.map(([value]) => value), tab, onTabChange)}>{activeTabs.map(([value, label]) => <button type="button" role="tab" tabIndex={tab === value ? 0 : -1} aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => onTabChange(value)} key={value}>{label}</button>)}</div>}
    <div className="guide-page-grid">
      {tab === 'overview' && <div className="learn-paths guide-wide" aria-label="Learning paths"><button type="button" className="learn-path formal" onClick={() => onTabChange('theory')}><span>01 · Mathematical reference</span><strong>Formal Modal Semantics</strong><p>Kripke frames and models, satisfaction, modal clauses, semantic scopes, and frame properties.</p><b>Open formal guide →</b></button><button type="button" className="learn-path gameplay" onClick={() => onTabChange('controls')}><span>02 · Game and interface</span><strong>Controls and Objectives</strong><p>Quickly look up map gestures, model editing, relation display, objectives, and local data.</p><b>Open controls reference →</b></button></div>}
      {tab === 'theory' && <><article><h2>Kripke frame</h2><p><strong>F = ⟨W,R⟩</strong>, where W is a non-empty set of worlds and <strong>R ⊆ W × W</strong> is the accessibility relation.</p></article><article><h2>Valuation</h2><p><strong>ν: Prop → ℘(W)</strong> assigns each propositional atom the worlds at which it is true.</p></article><article><h2>Kripke model</h2><p><strong>M = ⟨W,R,ν⟩</strong>. A pointed model additionally singles out an evaluation world w.</p></article><article><h2>Satisfaction</h2><p><strong>M,w ⊨ φ</strong> means that φ is true at w in M. Boolean connectives retain their classical truth conditions at each world.</p></article></>}
      {tab === 'operators' && <><article><h2>Necessity</h2><p><strong>M,w ⊨ □φ</strong> iff for every v, if wRv then M,v ⊨ φ.</p></article><article><h2>Possibility</h2><p><strong>M,w ⊨ ◇φ</strong> iff there is some v such that wRv and M,v ⊨ φ.</p><StaticKripkeDiagram compact ariaLabel="Possibility witness example" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }]} edges={[{ from: 'w0', to: 'w1' }]} /></article><article><h2>Vacuous truth</h2><p>If w has no successors, □φ is true and ◇φ is false. Necessity does not require a witness; possibility does.</p></article><article><h2>Nested modalities</h2><p>In □◇p, the game checks every immediate successor and then looks from each of them for a further p-successor.</p></article></>}
      {tab === 'scopes' && <><article><h2>Pointed truth</h2><p><strong>M,w ⊨ φ</strong>: evaluate one selected world under the displayed valuation.</p></article><article><h2>Model-global truth</h2><p><strong>M ⊨ φ</strong>: φ must hold at every world of the displayed model while ν remains fixed.</p></article><article><h2>Frame validity</h2><p><strong>F ⊨ φ</strong>: φ must hold at every world under every valuation on the displayed finite frame.</p></article><article><h2>Counterexamples</h2><p>A pointed or global failure identifies a world. Failure of frame validity additionally supplies a countervaluation.</p></article></>}
      {tab === 'relations' && <><article><h2>Frame properties</h2><p>Reflexive, symmetric, transitive, serial, Euclidean, irreflexive, and acyclic describe the accessibility relation, not the current valuation.</p></article><article><h2>Validate and enforce</h2><p>Validate reports whether a relation has a property. Enforce derives the closure needed for supported properties and displays derived relations separately.</p></article><article><h2>Modal axioms</h2><p>T, D, B, 4, and 5 are modal axiom schemas. Their validity characterizes familiar classes of frames.</p></article><article><h2>Instance comparison</h2><p>The Correspondence Lab compares both sides on one finite frame. Agreement there illustrates a theorem; it is not itself a general proof.</p></article></>}
      {tab === 'controls' && <><MapControlsReference onReplayTour={onReplayTour} /><article><h2>Local data</h2><p>Data exports or imports model JSON and resets the saved sandbox or learning progress independently.</p></article></>}
      {tab === 'objectives' && <><article><h2>Objective scopes</h2><p>Pointed, model-global, frame-validity, and correspondence objectives use different semantic quantification.</p></article><article><h2>Construction constraints</h2><p>Levels can bound size, require or forbid relations and atoms, and require or exclude frame properties.</p></article><article><h2>Locked inputs</h2><p>Formulas, worlds, valuations, relations, evaluation worlds, and constraint controls may be fixed.</p></article><article><h2>Optional bonuses</h2><p>Some missions evaluate an additional construction challenge only after the primary objective succeeds.</p></article></>}
      {tab === 'glossary' && <><article><h2>World</h2><p>An element of W representing a possible state. Worlds may share the same valuation while differing structurally.</p></article><article><h2>Successor</h2><p>v is a successor of w when wRv. Arrow direction matters.</p></article><article><h2>Valuation</h2><p>The assignment ν of propositional atoms to sets of worlds.</p></article><article><h2>Countervaluation</h2><p>A valuation witnessing that a formula is not valid on a frame.</p></article><article><h2>Explicit relation</h2><p>An accessibility pair stored directly in the construction.</p></article><article><h2>Derived relation</h2><p>A relation added by an enforced relational closure rather than drawn explicitly.</p></article></>}
    </div>
  </section>
}
