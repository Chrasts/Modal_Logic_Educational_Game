import type { ReactNode } from 'react'

export function MissionAuthoringView({ title, status, children, onBack }: { readonly title: string; readonly status?: string; readonly children: ReactNode; readonly onBack: () => void }) {
  return <section className="content-screen authoring-screen" aria-labelledby="authoring-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Creation studio</p><h1 id="authoring-title">{title}</h1><p>Design, verify, playtest, and package a mission without changing learner progress or the saved Model Sandbox.</p></div><button type="button" className="secondary-button" onClick={onBack}>Back to Create</button></div>
    <article className="level-author authoring-studio">{children}</article>
    {status && <p className="data-message" role="status">{status}</p>}
  </section>
}
