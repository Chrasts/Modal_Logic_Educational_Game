export const isTextEntryTarget = (target: EventTarget | null): boolean => (
  target instanceof HTMLInputElement
  || target instanceof HTMLTextAreaElement
  || target instanceof HTMLSelectElement
  || (target instanceof HTMLElement && target.isContentEditable)
)

export const shouldDeleteSelectedEdge = ({
  key,
  target,
  selectedEdgeKey,
  canEditEdges,
}: {
  readonly key: string
  readonly target: EventTarget | null
  readonly selectedEdgeKey: number | null
  readonly canEditEdges: boolean
}): boolean => (
  canEditEdges
  && selectedEdgeKey !== null
  && !isTextEntryTarget(target)
  && (key === 'Delete' || key === 'Backspace')
)
