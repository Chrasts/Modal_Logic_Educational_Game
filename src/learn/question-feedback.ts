import type { LearnLesson } from '../learn'

export function buildQuestionFeedback({ attemptCount, detail, correct, lesson }: { readonly attemptCount: number; readonly detail: string; readonly correct: boolean; readonly lesson?: LearnLesson }): string {
  if (correct) return lesson?.successExplanation ?? detail
  if (attemptCount <= 1) return detail
  if (attemptCount === 2) return [detail, lesson?.diagnosticFeedback?.objective].filter(Boolean).join(' ')
  return [detail, lesson?.successExplanation].filter(Boolean).join(' ')
}
