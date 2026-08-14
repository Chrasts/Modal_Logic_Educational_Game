import type { GameLevel } from '../campaign'

interface CreateViewProps {
  readonly templates: readonly GameLevel[]
  readonly selectedTemplateId: string
  readonly onSelectedTemplateChange: (id: string) => void
  readonly onOpenStudio: () => void
  readonly onOpenCampaign: () => void
  readonly onDuplicateTemplate: () => void
  readonly importSource: string
  readonly onImportSourceChange: (value: string) => void
  readonly onImportContent: () => void
}

export function CreateView({ templates, selectedTemplateId, onSelectedTemplateChange, onOpenStudio, onOpenCampaign, onDuplicateTemplate, importSource, onImportSourceChange, onImportContent }: CreateViewProps) {
  return <section className="content-screen create-screen" aria-labelledby="create-screen-title">
    <div className="screen-hero compact"><div><p className="eyebrow">Authoring tools</p><h1 id="create-screen-title">Create</h1><p>Author a custom mission or package missions into a shareable custom campaign. Your content remains separate from Learn, General Challenges, and Practice Library.</p></div></div>
    <div className="home-actions play-actions"><article className="featured"><span>Custom mission</span><h2>Build a constrained objective</h2><p>Capture a starting model, configure its objective and constraints, then verify a reference solution.</p><button type="button" className="primary-action" onClick={onOpenStudio}>New custom mission</button></article><article><span>Duplicate a built-in mission</span><h2>Start from a proven structure</h2><p>Copy content into the studio without changing the built-in original. The copy must receive its own reference solution.</p><select aria-label="Built-in mission template" value={selectedTemplateId} onChange={(event) => onSelectedTemplateChange(event.target.value)}>{templates.map((level) => <option value={level.id} key={level.id}>{level.chapter} · {level.title}</option>)}</select><button type="button" className="secondary-button" onClick={onDuplicateTemplate}>Duplicate into studio</button></article><article><span>Custom campaign</span><h2>Package missions</h2><p>Combine authored missions, download a JSON package, or create a browser-shareable link.</p><button type="button" className="secondary-button" onClick={onOpenCampaign}>Manage custom campaigns</button></article></div>
    <article className="create-import-card"><h2>Import custom content</h2><p>Paste a custom mission or campaign package. A mission opens in the authoring studio and a campaign opens its package.</p><label><span>Custom content JSON</span><textarea aria-label="Custom content JSON" value={importSource} onChange={(event) => onImportSourceChange(event.target.value)} spellCheck={false} /></label><button type="button" className="secondary-button" onClick={onImportContent}>Import into Create</button></article>
  </section>
}
