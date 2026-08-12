export const isTextEntryTarget = (target: EventTarget | null): boolean => (
  target instanceof HTMLInputElement
  || target instanceof HTMLTextAreaElement
  || target instanceof HTMLSelectElement
  || (target instanceof HTMLElement && target.isContentEditable)
)

export function shouldBeginValuationEdit({
  key,
  target,
  ctrlKey,
  metaKey,
  altKey,
  isComposing,
  hasSelectedWorld,
  valuationsVisible,
  canEditValuations,
  overlayOpen,
}: {
  readonly key: string
  readonly target: EventTarget | null
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
  readonly isComposing: boolean
  readonly hasSelectedWorld: boolean
  readonly valuationsVisible: boolean
  readonly canEditValuations: boolean
  readonly overlayOpen: boolean
}): boolean {
  if (!hasSelectedWorld || !valuationsVisible || !canEditValuations || overlayOpen) return false
  if (isTextEntryTarget(target) || ctrlKey || metaKey || altKey || isComposing) return false
  return /^[\p{L}\p{N}_]$/u.test(key)
}

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
