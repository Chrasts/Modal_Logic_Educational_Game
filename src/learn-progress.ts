export interface LearnProgress {
  readonly version: 1
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
}

export const learnProgressKey = 'logic-game:learn-progress:v1'
export const emptyLearnProgress = (): LearnProgress => ({ version: 1, completedLessonIds: [], completedChapterIds: [], highestStageByLesson: {}, attemptsByLesson: {}, successfulAttemptsByLesson: {}, predictionAnswers: {}, predictionCorrectness: {}, hintsUsed: {}, transferCompletedLessonIds: [], completedAt: {} })

export const loadLearnProgress = (): LearnProgress => {
  try {
    const stored = JSON.parse(localStorage.getItem(learnProgressKey) ?? 'null') as Partial<LearnProgress> | null
    if (!stored || stored.version !== 1) return emptyLearnProgress()
    return { ...emptyLearnProgress(), ...stored, completedLessonIds: Array.isArray(stored.completedLessonIds) ? stored.completedLessonIds : [], completedChapterIds: Array.isArray(stored.completedChapterIds) ? stored.completedChapterIds : [], transferCompletedLessonIds: Array.isArray(stored.transferCompletedLessonIds) ? stored.transferCompletedLessonIds : [] }
  } catch { return emptyLearnProgress() }
}
