import { describe, expect, it } from 'vitest'
import { learnLessons } from '../learn'
import { buildQuestionFeedback } from './question-feedback'

describe('buildQuestionFeedback', () => {
  const lesson = learnLessons[0]
  it('does not reveal the success explanation on a first wrong answer', () => {
    const feedback = buildQuestionFeedback({ attemptCount: 1, detail: 'Check the selected world.', correct: false, lesson })
    expect(feedback).not.toContain(lesson.successExplanation)
  })
  it('escalates later and uses full explanation on success', () => {
    expect(buildQuestionFeedback({ attemptCount: 3, detail: 'Try again.', correct: false, lesson })).toContain(lesson.successExplanation)
    expect(buildQuestionFeedback({ attemptCount: 1, detail: '', correct: true, lesson })).toBe(lesson.successExplanation)
  })
})
