export const isTextEntryTarget = (target: EventTarget | null): boolean => (
  target instanceof HTMLInputElement
  || target instanceof HTMLTextAreaElement
  || target instanceof HTMLSelectElement
  || (target instanceof HTMLElement && target.isContentEditable)
)

export type DeleteSelection =
  | { readonly kind: 'world'; readonly key: number }
  | { readonly kind: 'edge'; readonly key: number }
  | null

export function resolveDeleteSelection({
  key,
  target,
  selectedWorldKey,
  selectedEdgeKey,
  canEditWorlds,
  canEditEdges,
}: {
  readonly key: string
  readonly target: EventTarget | null
  readonly selectedWorldKey: number | null
  readonly selectedEdgeKey: number | null
  readonly canEditWorlds: boolean
  readonly canEditEdges: boolean
}): DeleteSelection {
  if ((key !== 'Delete' && key !== 'Backspace') || isTextEntryTarget(target)) return null
  if (selectedWorldKey !== null && canEditWorlds) return { kind: 'world', key: selectedWorldKey }
  if (selectedEdgeKey !== null && canEditEdges) return { kind: 'edge', key: selectedEdgeKey }
  return null
}
