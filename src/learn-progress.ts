export interface LearnProgress {
  readonly version: 1
  /** Revision of authored lesson semantics, independent of the storage schema. */
  readonly contentRevision?: number
  readonly completedLessonIds: readonly string[]
  readonly completedChapterIds: readonly string[]
  readonly currentLessonId?: string
  readonly highestStageByLesson: Readonly<Record<string, number>>
  readonly attemptsByLesson: Readonly<Record<string, number>>
  readonly successfulAttemptsByLesson: Readonly<Record<string, number>>
  readonly predictionAnswers: Readonly<Record<string, string>>
  readonly predictionCorrectness: Readonly<Record<string, boolean>>
  readonly hintsUsed: Readonly<Record<string, readonly number[]>>
  readonly transferCompletedLessonIds: readonly string[]
  readonly completedAt: Readonly<Record<string, string>>
  /** Kept optional in storage so existing v1 progress remains valid. */
  readonly welcomeViewed?: boolean
}

export const learnProgressKey = 'logic-game:learn-progress:v1'
export const currentLearnContentRevision = 2

const revisedLessonIds = new Set([
  'learn-worlds-add',
  'learn-worlds-directed-edge',
  'learn-worlds-direction',
  'learn-possibility-witness',
  'learn-possibility-accessibility',
  'learn-possibility-direction',
  'learn-possibility-build',
])
const revisedChapterIds = new Set(['worlds-accessibility', 'possibility'])

export const emptyLearnProgress = (): LearnProgress => ({ version: 1, contentRevision: currentLearnContentRevision, completedLessonIds: [], completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} })

export const migrateLearnProgress = (stored: Partial<LearnProgress>): LearnProgress => {
  const completedLessonIds = Array.isArray(stored.completedLessonIds) ? stored.completedLessonIds.filter((id): id is string => typeof id === 'string') : []
  const completedChapterIds = Array.isArray(stored.completedChapterIds) ? stored.completedChapterIds.filter((id): id is string => typeof id === 'string') : []
  const transferCompletedLessonIds = Array.isArray(stored.transferCompletedLessonIds) ? stored.transferCompletedLessonIds.filter((id): id is string => typeof id === 'string') : []
  const needsContentMigration = (stored.contentRevision ?? 1) < currentLearnContentRevision
  return {
    ...emptyLearnProgress(),
    ...stored,
    contentRevision: currentLearnContentRevision,
    completedLessonIds: needsContentMigration ? completedLessonIds.filter((id) => !revisedLessonIds.has(id)) : completedLessonIds,
    completedChapterIds: needsContentMigration ? completedChapterIds.filter((id) => !revisedChapterIds.has(id)) : completedChapterIds,
    transferCompletedLessonIds: needsContentMigration ? transferCompletedLessonIds.filter((id) => !revisedLessonIds.has(id)) : transferCompletedLessonIds,
  }
}

export const loadLearnProgress = (): LearnProgress => {
  try {
    const stored = JSON.parse(localStorage.getItem(learnProgressKey) ?? 'null') as Partial<LearnProgress> | null
    if (!stored || stored.version !== 1) return emptyLearnProgress()
    return migrateLearnProgress(stored)
  } catch { return emptyLearnProgress() }
}
