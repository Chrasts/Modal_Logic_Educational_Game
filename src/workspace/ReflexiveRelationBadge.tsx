import type { MouseEvent, PointerEvent } from 'react'
import type { ReflexiveRelationPresentation } from './relation-presentation'

export interface ReflexiveRelationBadgeProps {
  readonly presentation: ReflexiveRelationPresentation
  readonly selected: boolean
  readonly checked: boolean
  readonly editable: boolean
  readonly onSelect: (explicitKey: number | null) => void
}

export function ReflexiveRelationBadge({ presentation, selected, checked, editable, onSelect }: ReflexiveRelationBadgeProps) {
  const status = presentation.derived ? 'derived by enforced frame rules' : 'explicit relation'
  const label = `Reflexive accessibility at ${presentation.worldId || 'unnamed'}, ${status}`
  const stopPointerPropagation = (event: PointerEvent<HTMLButtonElement>) => event.stopPropagation()
  const selectRelation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onSelect(presentation.explicitKey !== undefined && editable ? presentation.explicitKey : null)
  }
  return <button
    type="button"
    className={`reflexive-badge nodrag nowheel ${presentation.derived ? 'derived' : 'explicit'}${selected ? ' selected' : ''}${checked ? ' trace-checked' : ''}`}
    title={label}
    aria-label={label}
    aria-disabled={presentation.derived || !editable}
    aria-pressed={presentation.explicitKey === undefined ? undefined : selected}
    data-reflexive-status={presentation.derived ? 'derived' : 'explicit'}
    onPointerDown={stopPointerPropagation}
    onDoubleClick={(event) => event.stopPropagation()}
    onClick={selectRelation}
  >↻</button>
}
