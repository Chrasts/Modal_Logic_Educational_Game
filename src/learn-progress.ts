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
export const currentLearnContentRevision = 3

export const emptyLearnProgress = (): LearnProgress => ({ version: 1, contentRevision: currentLearnContentRevision, completedLessonIds: [], completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} })

export const migrateLearnProgress = (stored: Partial<LearnProgress>): LearnProgress => {
  const lessonIds = new Set(learnLessons.map(({ id }) => id))
  const chapterIds = new Set(learnCourse.chapters.map(({ id }) => id))
  const completedLessonIds = Array.isArray(stored.completedLessonIds) ? stored.completedLessonIds.filter((id): id is string => typeof id === 'string' && lessonIds.has(id)) : []
  const completedChapterIds = Array.isArray(stored.completedChapterIds) ? stored.completedChapterIds.filter((id): id is string => typeof id === 'string' && chapterIds.has(id)) : []
  const transferCompletedLessonIds = Array.isArray(stored.transferCompletedLessonIds) ? stored.transferCompletedLessonIds.filter((id): id is string => typeof id === 'string' && lessonIds.has(id)) : []
  const lessonRecord = <T,>(record: Readonly<Record<string, T>> | undefined): Readonly<Record<string, T>> => Object.fromEntries(Object.entries(record ?? {}).filter(([id]) => lessonIds.has(id)))
  return {
    ...emptyLearnProgress(),
    ...stored,
    contentRevision: currentLearnContentRevision,
    // The remaining chapters are purely additive. Preserve every existing
    // completion even when loading an older content revision.
    completedLessonIds,
    completedChapterIds,
    transferCompletedLessonIds,
    currentLessonId: stored.currentLessonId && lessonIds.has(stored.currentLessonId) ? stored.currentLessonId : undefined,
    highestStageByLesson: lessonRecord(stored.highestStageByLesson),
    attemptsByLesson: lessonRecord(stored.attemptsByLesson),
    successfulAttemptsByLesson: lessonRecord(stored.successfulAttemptsByLesson),
    predictionAnswers: lessonRecord(stored.predictionAnswers),
    predictionCorrectness: lessonRecord(stored.predictionCorrectness),
    hintsUsed: lessonRecord(stored.hintsUsed),
    completedAt: lessonRecord(stored.completedAt),
  }
}

export const loadLearnProgress = (): LearnProgress => {
  try {
    const stored = JSON.parse(localStorage.getItem(learnProgressKey) ?? 'null') as Partial<LearnProgress> | null
    if (!stored || stored.version !== 1) return emptyLearnProgress()
    return migrateLearnProgress(stored)
  } catch { return emptyLearnProgress() }
}
import { learnCourse, learnLessons } from './learn'
