import { describe, expect, it } from 'vitest'
import { learnCourse, learnLessons } from './learn'
import { currentLearnContentRevision, emptyLearnProgress, migrateLearnProgress } from './learn-progress'
import { checkConstructionConstraints, parseFormula, verifyConstructionObjective, verifyObjective } from './logic'
import { isConstructionLevel, tutorialLevels, validateLevelObjective } from './campaign'
import { createLevelFingerprint } from './level-fingerprint'

describe('Learn Modal Logic course data', () => {
  it('defines the complete ordered 10-chapter, 56-lesson semantic path', () => {
    const chapter = (id: string) => learnCourse.chapters.find((item) => item.id === id)!
    expect(learnCourse.chapters.map(({ id }) => id)).toEqual(['truth-at-a-world', 'worlds-accessibility', 'possibility', 'necessity', 'box-diamond', 'nested-modalities', 'semantic-scopes', 'models-countermodels', 'frame-properties', 'modal-axioms'])
    expect(learnCourse.chapters.map(({ lessons }) => lessons.length)).toEqual([5, 5, 5, 6, 6, 5, 5, 7, 6, 6])
    expect(learnLessons).toHaveLength(56)
    for (const item of learnCourse.chapters) {
      expect(item.lessons.length, item.id).toBeGreaterThan(0)
    }
    expect(chapter('necessity').prerequisiteChapterIds).toEqual(['possibility'])
    expect(chapter('modal-axioms').prerequisiteChapterIds).toEqual(['frame-properties'])
  })

  it('uses only explicit, valid related-lesson metadata', () => {
    const ids = new Set(learnLessons.map(({ id }) => id))
    const linked = learnLessons.filter(({ relatedLessonIds }) => relatedLessonIds?.length)
    expect(linked.length).toBeGreaterThan(0)
    for (const lesson of linked) for (const relatedId of lesson.relatedLessonIds!) {
      expect(ids.has(relatedId), `${lesson.id} links to ${relatedId}`).toBe(true)
      expect(relatedId).not.toBe(lesson.id)
    }
  })

  it('covers box/diamond contrasts, dualities, nested operators, and scope comparison', () => {
    const tasks = learnLessons.map(({ task }) => task)
    const formulas = tasks.map(({ formula }) => formula)
    expect(formulas).toEqual(expect.arrayContaining(['◇◇p', '□◇p', '◇□p', '□□p']))
    expect(tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ formula: '(◇p → ¬□¬p) ∧ (¬□¬p → ◇p)', scope: 'frame' }),
      expect.objectContaining({ formula: '(□p → ¬◇¬p) ∧ (¬◇¬p → □p)', scope: 'frame' }),
      expect.objectContaining({ scopeComparison: { evaluationWorld: 'w0' }, prediction: expect.objectContaining({ kind: 'statement-choice', expectedChoice: 'pointed-true-model-false-frame-false' }) }),
    ]))
  })

  it('teaches the minimum frame-property and correspondence set as finite instances', () => {
    const propertyTasks = learnCourse.chapters.find(({ id }) => id === 'frame-properties')!.lessons.map(({ task }) => task)
    expect(propertyTasks.every(isConstructionLevel)).toBe(true)
    expect(propertyTasks.map(({ constraints }) => constraints?.requiredProperties?.[0])).toEqual(['reflexive', 'serial', 'symmetric', 'transitive', 'euclidean', 'reflexive'])
    const axiomTasks = learnCourse.chapters.find(({ id }) => id === 'modal-axioms')!.lessons.map(({ task }) => task)
    expect(axiomTasks.slice(0, 5).map(({ correspondencePreset }) => correspondencePreset)).toEqual(['t', 'd', 'b', '4', '5'])
    expect(axiomTasks.every(({ scope }) => scope === 'correspondence')).toBe(true)
  })

  it('contains an ordered five-lesson Possibility vertical slice', () => {
    const possibility = learnCourse.chapters.find(({ id }) => id === 'possibility')
    expect(possibility?.lessons).toHaveLength(5)
    expect(possibility?.lessons.map(({ title }) => title)).toEqual(['A possible alternative', 'Finding a witness', 'Accessibility is required', 'Direction of accessibility', 'Building a possibility model'])
  })

  it('uses prediction gates only for conceptually significant semantic decisions', () => {
    const chapter = (id: string) => learnCourse.chapters.find((item) => item.id === id)!
    const truth = chapter('truth-at-a-world')
    const worlds = chapter('worlds-accessibility')
    expect(truth.lessons.map(({ title }) => title)).toEqual(['Atomic truth', 'Truth depends on the selected world', 'Negation', 'Conjunction at one world', 'Same model, different truth'])
    expect(worlds.lessons.map(({ title }) => title)).toEqual(['Add a world', 'Directed accessibility', 'Direction matters', 'Branching', 'Reflexive edge'])
    const interactivePredictions = [...truth.lessons, ...worlds.lessons, ...chapter('possibility').lessons].filter(({ task }) => task.prediction)
    expect(interactivePredictions.map(({ id }) => id)).toEqual(['learn-possibility-alternative', 'learn-possibility-witness'])
    expect(interactivePredictions[1].task.prediction).toMatchObject({ kind: 'world-choice', expectedChoice: 'w3', mustBeCorrect: true })
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
    expect(construction('learn-worlds-add', ['w0', 'w1'], [])).toBe(false)
    expect(construction('learn-worlds-add', ['w0', 'w1', 'w2'], [])).toBe(true)
    expect(construction('learn-worlds-directed-edge', ['w0', 'w1', 'w2'], [])).toBe(false)
    expect(construction('learn-worlds-directed-edge', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }])).toBe(true)
    expect(construction('learn-worlds-directed-edge', ['w0', 'w1', 'w2'], [{ from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }])).toBe(false)
    expect(construction('learn-worlds-direction', ['w0', 'w1', 'w2'], [{ from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w0' }])).toBe(false)
    expect(construction('learn-worlds-direction', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w0' }])).toBe(true)
    expect(construction('learn-worlds-branching', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }])).toBe(false)
    expect(construction('learn-worlds-branching', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }])).toBe(true)
    expect(construction('learn-worlds-branching', ['w0', 'w1', 'w2'], [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w2' }])).toBe(false)
    expect(construction('learn-worlds-reflexive-edge', ['w0', 'w1'], [{ from: 'w0', to: 'w0' }])).toBe(false)
    expect(construction('learn-worlds-reflexive-edge', ['w0', 'w1'], [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w0' }])).toBe(true)
  })

  it('starts the revised Possibility lessons incomplete and accepts their intended solutions', () => {
    const task = (id: string) => learnLessons.find((lesson) => lesson.id === id)!.task
    const check = (id: string, edges: { from: string; to: string }[], valuation: Record<string, string[]>) => {
      const item = task(id)
      const input = { worldIds: item.worlds.map(({ id }) => id), explicitEdges: edges, effectiveEdges: edges, valuation }
      const constraintsPass = checkConstructionConstraints(input, item.constraints ?? {}).length === 0
      const semanticsPass = verifyObjective({ scope: item.scope!, targetTruth: item.targetTruth!, evaluationWorld: item.evaluationWorld }, {
        ...input, edges, formula: parseFormula(item.formula!),
      }).success
      return constraintsPass && semanticsPass
    }
    const initialPasses = (id: string) => {
      const item = task(id)
      return check(id, [...item.edges], Object.fromEntries(item.worlds.map(({ id, atoms }) => [id, atoms.split(/\s+/u).filter(Boolean)])))
    }

    expect(initialPasses('learn-possibility-accessibility')).toBe(false)
    expect(check('learn-possibility-accessibility', [{ from: 'w0', to: 'w1' }], { w0: [], w1: ['p'], w2: [] })).toBe(true)
    expect(initialPasses('learn-possibility-direction')).toBe(false)
    expect(check('learn-possibility-direction', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], { w0: [], w1: ['p'], w2: [] })).toBe(true)
    expect(initialPasses('learn-possibility-build')).toBe(false)
    expect(check('learn-possibility-build', [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], { w0: [], w1: ['p'], w2: ['p', 'q'] })).toBe(true)
  })

  it('has no identical Controls/Learn task fingerprints without an explicit allowlist', () => {
    const entries = [
      ...tutorialLevels.map((task) => ({ id: task.id, fingerprint: createLevelFingerprint(task) })),
      ...learnLessons.map(({ id, task }) => ({ id, fingerprint: createLevelFingerprint(task) })),
    ]
    const duplicates = entries.flatMap((entry, index) => entries.slice(index + 1)
      .filter((candidate) => candidate.fingerprint === entry.fingerprint)
      .map((candidate) => [entry.id, candidate.id].sort().join(' :: ')))
    const allowedDuplicates: readonly string[] = []
    expect(duplicates.filter((pair) => !allowedDuplicates.includes(pair))).toEqual([])
  })

  it('fingerprints all authored constraint and frame-rule semantics', () => {
    const base = tutorialLevels[0]
    const baseline = createLevelFingerprint(base)
    expect(createLevelFingerprint({ ...base, constraints: { ...base.constraints, requiredProperties: ['reflexive'] } })).not.toBe(baseline)
    expect(createLevelFingerprint({ ...base, bonusConstraints: { maximumEdges: 1 } })).not.toBe(baseline)
    expect(createLevelFingerprint({ ...base, frameRules: { reflexive: 'validate' } })).not.toBe(baseline)
    expect(createLevelFingerprint({ ...base, comparisonTarget: { formulaATruth: true, formulaBTruth: false } })).not.toBe(baseline)
  })

  it('migrates only progress whose authored lesson meaning changed', () => {
    const migrated = migrateLearnProgress({
      version: 1,
      completedLessonIds: ['learn-truth-atomic', 'learn-worlds-add', 'learn-possibility-witness'],
      completedChapterIds: ['truth-at-a-world', 'worlds-accessibility', 'possibility'],
      transferCompletedLessonIds: ['learn-truth-atomic', 'learn-possibility-build'],
    })
    expect(migrated.contentRevision).toBe(currentLearnContentRevision)
    expect(migrated.completedLessonIds).toEqual(['learn-truth-atomic', 'learn-worlds-add', 'learn-possibility-witness'])
    expect(migrated.completedChapterIds).toEqual(['truth-at-a-world', 'worlds-accessibility', 'possibility'])
    expect(migrated.transferCompletedLessonIds).toEqual(['learn-truth-atomic', 'learn-possibility-build'])
  })

  it('initializes isolated versioned course progress', () => {
    expect(emptyLearnProgress()).toMatchObject({ version: 1, contentRevision: currentLearnContentRevision, completedLessonIds: [], completedChapterIds: [] })
  })
})
