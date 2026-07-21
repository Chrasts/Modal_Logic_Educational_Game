import { describe, expect, it } from 'vitest'
import { learnCourse, learnLessons } from './learn'
import { emptyLearnProgress } from './learn-progress'
import { parseFormula } from './logic'

describe('Learn Modal Logic course data', () => {
  it('contains an ordered five-lesson Possibility vertical slice', () => {
    const possibility = learnCourse.chapters.find(({ id }) => id === 'possibility')
    expect(possibility?.lessons).toHaveLength(5)
    expect(possibility?.lessons.map(({ title }) => title)).toEqual(['A possible alternative', 'Finding a witness', 'Accessibility is required', 'Direction of accessibility', 'Building a possibility model'])
  })

  it('defines parseable formulas and valid task worlds', () => {
    for (const lesson of learnLessons) {
      expect(() => parseFormula(lesson.task.formula)).not.toThrow()
      expect(lesson.task.worlds.map(({ id }) => id)).toContain(lesson.task.evaluationWorld)
      expect(lesson.hints).toHaveLength(3)
    }
  })

  it('initializes isolated versioned course progress', () => {
    expect(emptyLearnProgress()).toMatchObject({ version: 1, completedLessonIds: [], completedChapterIds: [] })
  })
})
