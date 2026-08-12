import { useState } from 'react'
import { StaticKripkeDiagram } from '../components/StaticKripkeDiagram'
import { SectionTabs } from './SectionTabs'

type ReferenceSection = 'models' | 'operators' | 'scopes' | 'relations' | 'glossary'
const sections: readonly [ReferenceSection, string][] = [
  ['models', 'Frames & models'],
  ['operators', 'Box & diamond'],
  ['scopes', 'Semantic scopes'],
  ['relations', 'Relations & axioms'],
  ['glossary', 'Glossary'],
]

export function ReferenceView({ onOpenLearn, onOpenLab }: { readonly onOpenLearn: () => void; readonly onOpenLab: () => void }) {
  const [section, setSection] = useState<ReferenceSection>('models')
  return <section className="content-screen guide-screen" aria-labelledby="reference-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Mathematical lookup</p><h1 id="reference-title" className="clean-display">Modal Logic Reference</h1><p>Compact definitions for finite Kripke semantics. For guided teaching use Learn; for application operation use Help &amp; Controls.</p></div><div className="guide-actions"><button type="button" onClick={onOpenLearn}>Open Learn</button><button type="button" onClick={onOpenLab}>Try in Lab</button></div></div>
    <SectionTabs label="Reference sections" sections={sections} value={section} onChange={setSection} />
    <div className="guide-page-grid">
      {section === 'models' && <>
        <article><h2>Kripke frame</h2><p><strong>F = ⟨W,R⟩</strong>, where W is non-empty and <strong>R ⊆ W × W</strong>.</p></article>
        <article><h2>Kripke model</h2><p><strong>M = ⟨W,R,ν⟩</strong>, where <strong>ν: Prop → ℘(W)</strong>. A pointed model singles out an evaluation world w.</p></article>
        <article><h2>Satisfaction</h2><p><strong>M,w ⊨ φ</strong> means φ is true at w in M. Boolean connectives retain their classical conditions at each world.</p></article>
      </>}
      {section === 'operators' && <>
        <article><h2>Necessity</h2><p><strong>M,w ⊨ □φ</strong> iff every v with wRv satisfies φ.</p></article>
        <article><h2>Possibility</h2><p><strong>M,w ⊨ ◇φ</strong> iff some v with wRv satisfies φ.</p><StaticKripkeDiagram compact ariaLabel="Possibility witness example" evaluationWorld="w0" worlds={[{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }]} edges={[{ from: 'w0', to: 'w1' }]} /></article>
        <article><h2>Vacuous truth</h2><p>At a world with no successors, □φ is true and ◇φ is false.</p></article>
      </>}
      {section === 'scopes' && <>
        <article><h2>Pointed truth</h2><p><strong>M,w ⊨ φ</strong>: one world under the displayed valuation.</p></article>
        <article><h2>Model-global truth</h2><p><strong>M ⊨ φ</strong>: every world under the fixed displayed valuation.</p></article>
        <article><h2>Finite-frame validity</h2><p><strong>F ⊨ φ</strong>: every world under every valuation on the displayed finite frame.</p></article>
      </>}
      {section === 'relations' && <>
        <article><h2>Frame properties</h2><p>Reflexive, symmetric, transitive, serial, Euclidean, irreflexive, and acyclic describe R rather than ν.</p></article>
        <article><h2>Modal axioms</h2><p>T, D, B, 4, and 5 are modal axiom schemas associated with familiar frame classes.</p></article>
        <article><h2>Instance caveat</h2><p>Agreement between validity and a property on one finite frame illustrates correspondence; it does not prove the general theorem.</p></article>
      </>}
      {section === 'glossary' && <>
        <article><h2>World</h2><p>An element of W representing a possible state.</p></article>
        <article><h2>Successor</h2><p>v is a successor of w when wRv.</p></article>
        <article><h2>Countervaluation</h2><p>A valuation witnessing that a formula is not valid on a frame.</p></article>
        <article><h2>Derived relation</h2><p>A pair added by an enforced closure rather than drawn explicitly.</p></article>
      </>}
    </div>
  </section>
}
