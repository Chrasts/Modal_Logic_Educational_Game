import type { FramePropertyName } from './frame'

export type FrameRuleMode = 'off' | 'validate' | 'enforce'
export interface FrameRuleConflict { readonly id: 'reflexive-irreflexive' | 'reflexive-acyclic' | 'serial-acyclic' | 'serial-transitive-irreflexive'; readonly properties: readonly FramePropertyName[]; readonly message: string }

export function findFrameRuleConflicts(frameRules: Readonly<Partial<Record<FramePropertyName, FrameRuleMode>>>, worldCount: number): readonly FrameRuleConflict[] {
  if (worldCount === 0) return []
  const active = (property: FramePropertyName) => (frameRules[property] ?? 'off') !== 'off'
  const conflict = (id: FrameRuleConflict['id'], properties: readonly FramePropertyName[]): FrameRuleConflict => ({ id, properties, message: 'These requirements cannot all hold on a non-empty finite frame.' })
  const conflicts: FrameRuleConflict[] = []
  if (active('reflexive') && active('irreflexive')) conflicts.push(conflict('reflexive-irreflexive', ['reflexive', 'irreflexive']))
  if (active('reflexive') && active('acyclic')) conflicts.push(conflict('reflexive-acyclic', ['reflexive', 'acyclic']))
  if (active('serial') && active('acyclic')) conflicts.push(conflict('serial-acyclic', ['serial', 'acyclic']))
  if (active('serial') && active('transitive') && active('irreflexive')) conflicts.push(conflict('serial-transitive-irreflexive', ['serial', 'transitive', 'irreflexive']))
  return conflicts
}
