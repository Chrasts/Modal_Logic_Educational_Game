import { describe, expect, it } from 'vitest'
import { learnCourse, learnLessons } from './learn'
import { emptyLearnProgress } from './learn-progress'
import { checkConstructionConstraints, parseFormula, verifyConstructionObjective, verifyObjective } from './logic'
import { isConstructionLevel, validateLevelObjective } from './campaign'

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
      expect(() => validateLevelObjective(lesson.task)).not.toThrow()
      if (!isConstructionLevel(lesson.task)) expect(() => parseFormula(lesson.task.formula!)).not.toThrow()
      expect(lesson.task.worlds.map(({ id }) => id)).toContain(lesson.task.evaluationWorld)
      expect(lesson.hints).toHaveLength(3)
    }
  })

  it('behaviourally verifies all ten introductory missions', () => {
    const task = (id: string) => learnLessons.find((lesson) => lesson.id === id)!.task
    const semantic = (id: string, evaluationWorld: string, valuation: Record<string, string[]>) => {
      const item = task(id)
      return verifyObjective({ scope: item.scope!, targetTruth: item.targetTruth!, evaluationWorld }, {
        worldIds: item.worlds.map(({ id }) => id), edges: item.edges, valuation, formula: parseFormula(item.formula!),
      }).success
    }
    const construction = (id: string, worldIds: string[], edges: { from: string; to: string }[]) => {
      const item = task(id)
      const valuation = Object.fromEntries(worldIds.map((id) => [id, []]))
      return checkConstructionConstraints({ worldIds, explicitEdges: edges, effectiveEdges: edges, valuation }, item.constraints ?? {}).length === 0
        && verifyConstructionObjective(item.structuralObjective ?? {}, { evaluationWorld: item.evaluationWorld }).success
    }

    expect(semantic('learn-truth-atomic', 'w0', { w0: [] })).toBe(false)
    expect(semantic('learn-truth-atomic', 'w0', { w0: ['p'] })).toBe(true)
    expect(semantic('learn-truth-selected-world', 'w0', { w0: ['p'], w1: [] })).toBe(false)
    expect(semantic('learn-truth-selected-world', 'w1', { w0: ['p'], w1: [] })).toBe(true)
    expect(semantic('learn-truth-negation', 'w0', { w0: ['p'] })).toBe(false)
    expect(semantic('learn-truth-negation', 'w0', { w0: [] })).toBe(true)
    expect(semantic('learn-truth-conjunction', 'w0', { w0: ['p'] })).toBe(false)
    expect(semantic('learn-truth-conjunction', 'w0', { w0: ['p', 'q'] })).toBe(true)
    expect(semantic('learn-truth-same-model', 'w1', { w0: ['p'], w1: ['q'] })).toBe(false)
    expect(semantic('learn-truth-same-model', 'w0', { w0: ['p'], w1: ['q'] })).toBe(true)

    expect(construction('learn-worlds-add', ['w0'], [])).toBe(false)
    expect(construction('learn-worlds-add', ['w0', 'w1'], [])).toBe(true)
    expect(construction('learn-worlds-directed-edge', ['w0', 'w1'], [])).toBe(false)
    expect(construction('learn-worlds-directed-edge', ['w0', 'w1'], [{ from: 'w0', to: 'w1' }])).toBe(true)
    expect(construction('learn-worlds-directed-edge', ['w0', 'w1'], [{ from: 'w1', to: 'w0' }])).toBe(false)
    expect(construction('learn-worlds-direction', ['w0', 'w1'], [{ from: 'w1', to: 'w0' }])).toBe(false)
    expect(construction('learn-worlds-direction', ['w0', 'w1'], [{ from: 'w0', to: 'w1' }])).toBe(true)
    expect(construction('learn-worlds-branching', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }])).toBe(false)
    expect(construction('learn-worlds-branching', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])).toBe(true)
    expect(construction('learn-worlds-branching', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w2' }])).toBe(false)
    expect(construction('learn-worlds-reflexive-edge', ['w0', 'w1'], [{ from: 'w0', to: 'w0' }])).toBe(false)
    expect(construction('learn-worlds-reflexive-edge', ['w0', 'w1'], [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w0' }])).toBe(true)
  })

  it('initializes isolated versioned course progress', () => {
    expect(emptyLearnProgress()).toMatchObject({ version: 1, completedLessonIds: [], completedChapterIds: [] })
  })
})
