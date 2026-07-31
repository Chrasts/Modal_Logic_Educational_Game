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

  it('presents the first two complete introductory campaigns without prediction gates', () => {
    const chapter = (id: string) => learnCourse.chapters.find((item) => item.id === id)!
    const truth = chapter('truth-at-a-world')
    const worlds = chapter('worlds-accessibility')
    expect(truth.lessons.map(({ title }) => title)).toEqual(['Atomic truth', 'Truth depends on the selected world', 'Negation', 'Conjunction at one world', 'Same model, different truth'])
    expect(worlds.lessons.map(({ title }) => title)).toEqual(['Add a world', 'Directed accessibility', 'Direction matters', 'Branching', 'Reflexive edge'])
    expect([...truth.lessons, ...worlds.lessons, ...chapter('possibility').lessons].every(({ task }) => task.prediction === undefined)).toBe(true)
    expect(chapter('possibility').prerequisiteChapterIds).toEqual(['worlds-accessibility'])
  })

  it('uses locked controls and incomplete starting states for introductory tasks', () => {
    const chapters = learnCourse.chapters.filter(({ id }) => id === 'truth-at-a-world' || id === 'worlds-accessibility')
    for (const lesson of chapters.flatMap(({ lessons }) => lessons)) {
      expect(lesson.task.editable.length, lesson.id).toBe(1)
      expect(lesson.task.prediction, lesson.id).toBeUndefined()
    }
    const branching = chapters.flatMap(({ lessons }) => lessons).find(({ id }) => id === 'learn-worlds-branching')!.task
    expect(branching.constraints?.requiredEdges).toEqual([{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])
    expect(branching.constraints?.maximumEdges).toBe(2)
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
