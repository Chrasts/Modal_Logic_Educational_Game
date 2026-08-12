export type LearningDestination =
  | { readonly kind: 'control'; readonly id: string; readonly index: number }
  | { readonly kind: 'lesson'; readonly id: string; readonly index: number }

export interface LearningNavigation {
  readonly previous: LearningDestination | null
  readonly next: LearningDestination | null
}

interface LearningPathItem {
  readonly id: string
}

export function resolveLearningNavigation(
  current: Pick<LearningDestination, 'kind' | 'id'>,
  controls: readonly LearningPathItem[],
  lessons: readonly LearningPathItem[],
): LearningNavigation {
  const path: LearningDestination[] = [
    ...controls.map(({ id }, index): LearningDestination => ({ kind: 'control', id, index })),
    ...lessons.map(({ id }, index): LearningDestination => ({ kind: 'lesson', id, index })),
  ]
  const currentIndex = path.findIndex(({ kind, id }) => kind === current.kind && id === current.id)
  if (currentIndex < 0) return { previous: null, next: null }
  return {
    previous: path[currentIndex - 1] ?? null,
    next: path[currentIndex + 1] ?? null,
  }
}
