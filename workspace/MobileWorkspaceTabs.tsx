import type { KeyboardEvent } from 'react'

export type MobileWorkspaceTab = 'model' | 'formula' | 'result'

export function MobileWorkspaceTabs({ activeTab, showFormula, onChange }: { readonly activeTab: MobileWorkspaceTab; readonly showFormula: boolean; readonly onChange: (tab: MobileWorkspaceTab) => void }) {
  const tabs: readonly MobileWorkspaceTab[] = showFormula ? ['model', 'formula', 'result'] : ['model', 'result']
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[nextIndex])
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }
  return <nav className="mobile-workspace-tabs" aria-label="Workspace sections" role="tablist">
    {tabs.map((tab, index) => <button key={tab} type="button" role="tab" className={activeTab === tab ? 'active' : ''} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} onClick={() => onChange(tab)} onKeyDown={(event) => move(event, index)}>{tab}</button>)}
  </nav>
}
