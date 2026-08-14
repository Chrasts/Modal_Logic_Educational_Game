import { useState } from 'react'
import { StaticKripkeDiagram } from '../components/StaticKripkeDiagram'
import { frameCorrespondences, furtherReading, glossary } from '../reference/reference-content'
import { SectionTabs } from './SectionTabs'

type ReferenceSection = 'semantics' | 'scopes' | 'frames' | 'countermodels' | 'glossary' | 'reading'
const sections: readonly [ReferenceSection, string][] = [
  ['semantics', 'Core semantics'],
  ['scopes', 'Truth scopes'],
  ['frames', 'Frames and systems'],
  ['countermodels', 'Countermodels'],
  ['glossary', 'Glossary'],
  ['reading', 'Further reading'],
]

export function ReferenceView({ onOpenLearn, onOpenLab }: { readonly onOpenLearn: () => void; readonly onOpenLab: () => void }) {
  const [section, setSection] = useState<ReferenceSection>('semantics')
  return <section className="content-screen guide-screen reference-screen" aria-labelledby="reference-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Visual mathematical lookup</p><h1 id="reference-title" className="clean-display">Modal Logic Reference</h1><p>Compact definitions and examples for finite Kripke semantics. Use Learn for guided teaching.</p></div><div className="guide-actions"><button type="button" onClick={onOpenLearn}>Open Learn</button><button type="button" onClick={onOpenLab}>Try in Lab</button></div></div>
    <SectionTabs label="Reference sections" sections={sections} value={section} onChange={setSection} />
    <div className="guide-page-grid reference-grid">
      {section === 'semantics' && <>
        <article><h2>Modal language</h2><p>Formulas use atoms, Boolean connectives, <strong>□</strong> for necessity, and <strong>◇</strong> for possibility.</p></article>
        <article><h2>Kripke frame</h2><p><strong>F = ⟨W,R⟩</strong>, where W is non-empty and <strong>R ⊆ W × W</strong>.</p></article>
        <article><h2>Kripke model</h2><p><strong>M = ⟨W,R,ν⟩</strong>, where <strong>ν: Prop → ℘(W)</strong>.</p></article>
        <article><h2>Satisfaction</h2><p><strong>M,w ⊨ φ</strong> means φ is true at w in M.</p></article>
        <article className="reference-diagram-card"><h2>Possibility</h2><p><strong>M,w ⊨ ◇φ</strong> iff some v with wRv satisfies φ.</p><StaticKripkeDiagram compact ariaLabel="Possibility witness from w0 to w1 where p is true" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }]} edges={[{ from: 'w0', to: 'w1' }]} /><small>w1 is a witness for ◇p at w0.</small></article>
        <article className="reference-diagram-card"><h2>Necessity</h2><p><strong>M,w ⊨ □φ</strong> iff every v with wRv satisfies φ.</p><StaticKripkeDiagram compact ariaLabel="Necessity counterexample from w0 to w1 where p is false" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: '' }, { id: 'w1', atoms: '' }]} edges={[{ from: 'w0', to: 'w1' }]} /><small>w1 is a counterexample to □p at w0.</small></article>
        <article className="reference-diagram-card"><h2>Vacuous truth</h2><p>At a world with no successors, □φ is true and ◇φ is false.</p><StaticKripkeDiagram compact ariaLabel="Isolated world showing vacuous necessity" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: '' }]} edges={[]} /><small>There is no successor that can falsify φ.</small></article>
      </>}
      {section === 'scopes' && <>
        <article><h2>Pointed truth</h2><p><strong>M,w ⊨ φ</strong> quantifies at one selected world under the current valuation.</p></article>
        <article><h2>Model-global truth</h2><p><strong>M ⊨ φ</strong> checks every world while keeping the displayed valuation fixed.</p></article>
        <article><h2>Finite-frame validity</h2><p><strong>F ⊨ φ</strong> checks every world under every valuation on the displayed finite frame.</p></article>
        <table><caption>How the semantic scope changes</caption><thead><tr><th>Scope</th><th>Worlds</th><th>Valuations</th></tr></thead><tbody><tr><th>Pointed</th><td>One selected world</td><td>Current valuation</td></tr><tr><th>Model-global</th><td>Every world</td><td>Current valuation</td></tr><tr><th>Frame validity</th><td>Every world</td><td>Every valuation</td></tr></tbody></table>
      </>}
      {section === 'frames' && <>
        <article className="reference-wide"><h2>Standard correspondences</h2><table><thead><tr><th>System</th><th>Axiom</th><th>Frame condition</th><th>Intuition</th></tr></thead><tbody>{frameCorrespondences.map((row) => <tr key={row.system}><th scope="row">{row.system}</th><td><code>{row.axiom}</code></td><td>{row.condition}</td><td>{row.intuition}</td></tr>)}</tbody></table></article>
        <article><h2>Other frame conditions</h2><p><strong>Irreflexive</strong> means no w has wRw. <strong>Acyclic</strong> means there is no directed cycle.</p></article>
        <article><h2>Correspondence caveat</h2><p>A finite example can illustrate a correspondence. Agreement on one frame is not a proof of the general theorem.</p></article>
      </>}
      {section === 'countermodels' && <>
        <article><h2>Countermodel</h2><p>A countermodel supplies a model, an evaluation world, and a valuation where a claimed formula is false.</p></article>
        <article><h2>Countervaluation</h2><p>For a fixed frame, a countervaluation assigns atoms so the formula fails at some world. The frame itself need not change.</p></article>
        <article className="reference-diagram-card"><h2>Example: □p does not follow</h2><StaticKripkeDiagram compact ariaLabel="Countermodel for box p" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: 'p' }, { id: 'w1', atoms: '' }]} edges={[{ from: 'w0', to: 'w1' }]} /><p>At w0, the successor w1 makes p false, so □p is false.</p></article>
      </>}
      {section === 'glossary' && glossary.map(([term, definition]) => <article key={term}><h2>{term}</h2><p>{definition}</p></article>)}
      {section === 'reading' && furtherReading.map((resource) => <article className="reading-card" key={resource.href}><span>External resource</span><h2><a href={resource.href} target="_blank" rel="noreferrer">{resource.title}</a></h2><strong>{resource.source}</strong><p>{resource.description}</p></article>)}
    </div>
  </section>
}
