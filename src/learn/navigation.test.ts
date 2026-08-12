import { describe, expect, it } from 'vitest'
import { tutorialLevels } from '../campaign'
import { learnCourse, learnLessons } from '../learn'
import { resolveLearningNavigation } from './navigation'

describe('global learning-path navigation', () => {
  it('moves from controls lesson 5 to controls lesson 6', () => {
    const current = tutorialLevels[4]
    expect(resolveLearningNavigation({ kind: 'control', id: current.id }, tutorialLevels, learnLessons).next).toMatchObject({ kind: 'control', id: tutorialLevels[5].id })
  })

  it('moves from the final controls lesson to the first modal-logic lesson', () => {
    expect(resolveLearningNavigation({ kind: 'control', id: tutorialLevels.at(-1)!.id }, tutorialLevels, learnLessons).next).toMatchObject({ kind: 'lesson', id: learnLessons[0].id })
  })

  it('crosses Learn chapter boundaries in both directions', () => {
    const firstChapter = learnCourse.chapters.find(({ lessons }) => lessons.length > 0)!
    const nextChapter = learnCourse.chapters.slice(learnCourse.chapters.indexOf(firstChapter) + 1).find(({ lessons }) => lessons.length > 0)!
    const lastInFirst = firstChapter.lessons.at(-1)!
    const firstInNext = nextChapter.lessons[0]
    expect(resolveLearningNavigation({ kind: 'lesson', id: lastInFirst.id }, tutorialLevels, learnLessons).next).toMatchObject({ id: firstInNext.id })
    expect(resolveLearningNavigation({ kind: 'lesson', id: firstInNext.id }, tutorialLevels, learnLessons).previous).toMatchObject({ id: lastInFirst.id })
  })

  it('has no next destination after the final course lesson', () => {
    expect(resolveLearningNavigation({ kind: 'lesson', id: learnLessons.at(-1)!.id }, tutorialLevels, learnLessons).next).toBeNull()
  })

  it('returns the same destination without depending on completion or replay state', () => {
    const current = { kind: 'control' as const, id: tutorialLevels.at(-1)!.id }
    const freshlyCompleted = resolveLearningNavigation(current, tutorialLevels, learnLessons)
    const replayedCompleted = resolveLearningNavigation(current, tutorialLevels, learnLessons)
    expect(replayedCompleted.next).toEqual(freshlyCompleted.next)
  })
})
