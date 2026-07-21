import type { GameLevel } from './campaign'
import { tutorialLevels } from './campaign'

export type LearnStage = 'concept' | 'example' | 'prediction' | 'task' | 'feedback' | 'transfer' | 'completion'

export interface LearnConcept {
  readonly heading: string
  readonly intuitive: string
  readonly formal?: string
  readonly formula?: string
  readonly keyPoints: readonly string[]
  readonly warning?: string
}

export interface WorkedExample {
  readonly formula: string
  readonly evaluationWorld: string
  readonly worlds: readonly { readonly id: string; readonly atoms: string; readonly position: { readonly x: number; readonly y: number } }[]
  readonly edges: readonly { readonly from: string; readonly to: string }[]
  readonly steps: readonly string[]
}

export interface LearnLesson {
  readonly id: string
  readonly chapterId: string
  readonly title: string
  readonly learningObjective: string
  readonly stages: readonly LearnStage[]
  readonly concept: LearnConcept
  readonly workedExample?: WorkedExample
  readonly task: GameLevel
  readonly hints: readonly [string, string, string]
  readonly successExplanation: string
  readonly commonMistake?: string
  readonly diagnosticFeedback?: Readonly<Record<string, string>>
  readonly transferTask?: GameLevel
}

export interface LearnChapter {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly prerequisiteChapterIds: readonly string[]
  readonly lessons: readonly LearnLesson[]
  readonly completionSummary: readonly string[]
  readonly nextPreview?: string
}

export interface LearnCourse {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly chapters: readonly LearnChapter[]
}

const w = (id: string, atoms: string, x: number, y: number) => ({ id, atoms, position: { x, y } })

const possibilityLessons: readonly LearnLesson[] = [
  {
    id: 'learn-possibility-alternative', chapterId: 'possibility', title: 'A possible alternative',
    learningObjective: 'Understand that ◇p is true when at least one accessible alternative satisfies p.',
    stages: ['concept', 'example', 'prediction', 'task', 'feedback'],
    concept: {
      heading: 'Possibility needs one accessible witness',
      intuitive: 'A claim is possible at the current world when at least one relevant alternative makes it true.',
      formal: 'M,w ⊨ ◇p iff there is a v such that wRv and M,v ⊨ p.', formula: '◇p',
      keyPoints: ['One witness is enough.', 'The witness must be accessible from the evaluation world.'],
      warning: 'A p-world somewhere else in the model is not enough.',
    },
    workedExample: { formula: '◇p', evaluationWorld: 'w0', worlds: [w('w0', '', 100, 130), w('w1', 'p', 390, 70), w('w2', '', 390, 210)], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], steps: ['Start at the evaluation world w0.', 'Its accessible successors are w1 and w2.', 'p is true at w1.', 'Therefore w1 witnesses ◇p at w0.'] },
    task: { id: 'learn-possibility-alternative-task', chapter: 'Possibility', title: 'A possible alternative', concept: 'Accessible witness', learningObjective: 'Make one accessible successor satisfy p.', briefing: 'Change only valuations. The arrows already identify the relevant alternatives.', instruction: 'Make ◇p true at w0 by changing only the valuation.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Will ◇p be true at w0 after you add p to an accessible successor?' }, worlds: [w('w0', '', 90, 130), w('w1', '', 380, 65), w('w2', '', 380, 205)], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['valuations'] },
    hints: ['◇p needs at least one accessible successor where p is true.', 'Inspect the worlds reached by arrows leaving w0.', 'Add p to w1 or w2.'],
    successExplanation: '◇p is true at w0 because an accessible successor now satisfies p. That successor is a witness for the possibility claim.',
  },
  {
    id: 'learn-possibility-witness', chapterId: 'possibility', title: 'Finding a witness',
    learningObjective: 'Identify the accessible world that witnesses a possibility formula.', stages: ['concept', 'prediction', 'feedback'],
    concept: { heading: 'A witness satisfies the whole operand', intuitive: 'For ◇(p ∧ q), one accessible world must make both p and q true.', formal: 'The same successor must satisfy every part of p ∧ q.', formula: '◇(p ∧ q)', keyPoints: ['Only one witness is needed.', 'A world satisfying only p or only q is not enough.'] },
    task: { id: 'learn-possibility-witness-task', chapter: 'Possibility', title: 'Finding a witness', concept: 'Witness identification', learningObjective: 'Select the accessible witness for ◇(p ∧ q).', instruction: 'Identify the world that witnesses ◇(p ∧ q) at w0, then verify.', formula: '◇(p ∧ q)', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'Which accessible world witnesses ◇(p ∧ q) at w0?', expectedChoice: 'w3', worldChoices: ['w1', 'w2', 'w3'] }, worlds: [w('w0', '', 60, 130), w('w1', 'p', 270, 45), w('w2', 'q', 270, 130), w('w3', 'p q', 270, 215)], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' }], constraints: { minimumWorlds: 4, maximumWorlds: 4, minimumEdges: 3, maximumEdges: 3 }, editable: [] },
    hints: ['A witness for a conjunction must satisfy both conjuncts.', 'Compare the valuations of w1, w2, and w3.', 'Select w3: it is the accessible world where both p and q hold.'],
    successExplanation: 'w3 is an accessible witness because it satisfies both p and q. The other successors each satisfy only one conjunct.', commonMistake: 'Selecting a world that satisfies only one conjunct.',
  },
  {
    id: 'learn-possibility-accessibility', chapterId: 'possibility', title: 'Accessibility is required',
    learningObjective: 'Distinguish truth somewhere in a model from truth in an accessible alternative.', stages: ['concept', 'prediction', 'task', 'feedback'],
    concept: { heading: 'Truth elsewhere is not enough', intuitive: 'A p-world matters to ◇p at w0 only if w0 can access it.', formal: 'The existential witness v must satisfy both wRv and M,v ⊨ p.', formula: '◇p', keyPoints: ['p may be true somewhere in the model.', 'Without an outgoing edge from w0, it is not a witness.'] },
    task: { id: 'learn-possibility-accessibility-task', chapter: 'Possibility', title: 'Accessibility is required', concept: 'Accessible witness', learningObjective: 'Make the existing p-world accessible from w0.', instruction: 'Make ◇p true at w0 by changing only the accessibility relation.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is ◇p true at w0 merely because p is true somewhere in the model?' }, worlds: [w('w0', '', 100, 130), w('w1', 'p', 390, 130)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'] },
    hints: ['◇p needs an accessible p-world.', 'The p-world is w1, but no arrow leaves w0.', 'Add an edge from w0 to w1.'],
    successExplanation: 'The edge from w0 to w1 makes the p-world a relevant alternative and therefore a witness for ◇p.', diagnosticFeedback: { 'missing-diamond-witness': 'A p-world exists, but it is not accessible from w0. Possibility is evaluated only over worlds reachable from the evaluation world.' },
  },
  {
    id: 'learn-possibility-direction', chapterId: 'possibility', title: 'Direction of accessibility',
    learningObjective: 'Understand that a witness edge must point from the evaluation world to the witness world.', stages: ['concept', 'prediction', 'task', 'feedback'],
    concept: { heading: 'Accessibility is directional', intuitive: 'An arrow pointing into the current world does not make its source available from that world.', formal: 'For w1 to witness ◇p at w0, the relation must contain w0Rw1.', formula: '◇p', keyPoints: ['Arrow direction matters.', 'The witness must be reachable from the evaluation world.'] },
    task: { id: 'learn-possibility-direction-task', chapter: 'Possibility', title: 'Direction of accessibility', concept: 'Directional relation', learningObjective: 'Reverse the edge so the p-world is reachable from w0.', instruction: 'Make ◇p true at w0 using exactly one edge.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Does the edge w1 → w0 make ◇p true at w0?' }, worlds: [w('w0', '', 100, 130), w('w1', 'p', 390, 130)], edges: [{ from: 'w1', to: 'w0' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'] },
    hints: ['Read ◇p from w0 outward.', 'The current arrow points toward w0.', 'Remove w1 → w0 and add w0 → w1.'],
    successExplanation: 'Accessibility is directional. w1 is a witness only when it is reachable from w0.', diagnosticFeedback: { 'missing-diamond-witness': 'The current edge points toward the evaluation world. For w1 to witness ◇p at w0, the edge must point from w0 to w1.' },
  },
  {
    id: 'learn-possibility-build', chapterId: 'possibility', title: 'Building a possibility model',
    learningObjective: 'Construct a simple model satisfying a possibility formula.', stages: ['concept', 'prediction', 'task', 'feedback', 'transfer'],
    concept: { heading: 'Build an accessible witness', intuitive: 'A successful possibility model needs a p-world that can be reached from the evaluation world.', formal: 'Choose v with w0Rv and M,v ⊨ p.', formula: '◇p', keyPoints: ['The evaluation world need not satisfy p.', 'One edge and one accessible p-world are enough.'] },
    task: { id: 'learn-possibility-build-task', chapter: 'Possibility', title: 'Building a possibility model', concept: 'Possibility construction', learningObjective: 'Construct a two-world model with one accessible p-witness.', instruction: 'Build a two-world model in which ◇p is true at w0 using exactly one accessibility edge.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'model-choice', prompt: 'What must every successful model contain?', expectedChoice: 'A', modelChoices: [{ id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [{ from: 'w0', to: 'w1' }] }, { id: 'B', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: 'p' }, { id: 'w1', atoms: '' }], edges: [{ from: 'w1', to: 'w0' }] }] }, worlds: [w('w0', '', 100, 130), w('w1', '', 390, 130)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1 }, editable: ['valuations', 'edges'] },
    hints: ['Every successful solution needs an accessible p-world.', 'You have two fixed worlds and need exactly one edge.', 'Add p at w1 and draw w0 → w1.'],
    successExplanation: 'Your model contains an accessible witness for p. The evaluation world itself does not need to satisfy p.',
    transferTask: { id: 'learn-possibility-build-transfer', chapter: 'Possibility', title: 'Optional transfer: remove possibility', concept: 'Relation-only change', instruction: 'Keep the worlds and valuation, but make ◇p false by changing only the relation.', formula: '◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 100, 130), w('w1', 'p', 390, 130)], edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 1 }, editable: ['edges'] },
  },
]

// Legacy tutorial missions stay stable for saved progress and links, but are now
// presented as the first chapter of the guided Learn course.
const howToPlayLessons: readonly LearnLesson[] = tutorialLevels.map((task) => ({
  id: `learn-how-to-play-${task.id}`,
  chapterId: 'how-to-play',
  title: task.title,
  learningObjective: task.learningObjective ?? task.concept,
  stages: ['concept', 'task', 'feedback'],
  concept: {
    heading: task.concept,
    intuitive: task.briefing ?? task.instruction,
    keyPoints: ['Work only with the controls unlocked for this task.', 'Use Verify objective to check the model when you are ready.'],
  },
  task,
  hints: ['Read the objective and identify which part of the model is currently editable.', 'Use the relevant panel or map control, then check the objective again.', task.instruction],
  successExplanation: `You completed the interface step “${task.title}”. The same workspace controls will be used throughout Learn, Practice, and future Campaigns.`,
}))

export const learnCourse: LearnCourse = {
  id: 'learn-modal-logic', title: 'Learn Modal Logic', description: 'A guided course in building and evaluating finite Kripke models.',
  chapters: [
    { id: 'how-to-play', title: 'How to Play', description: 'Learn the workspace controls and verification flow before the semantic chapters.', prerequisiteChapterIds: [], lessons: howToPlayLessons, completionSummary: ['A model is built from worlds, valuations, and directed accessibility edges.', 'A mission can unlock only the controls relevant to its objective.', 'Verify objective checks the configured semantic goal.'], nextPreview: 'Next: truth at a designated world and the difference between local and global claims.', },
    { id: 'truth-at-a-world', title: 'Truth at a World', description: 'Evaluate formulas at a designated world.', prerequisiteChapterIds: ['how-to-play'], lessons: [], completionSummary: [], },
    { id: 'worlds-accessibility', title: 'Worlds and Accessibility', description: 'Build worlds and directed accessibility relations.', prerequisiteChapterIds: ['truth-at-a-world'], lessons: [], completionSummary: [], },
    { id: 'possibility', title: 'Possibility', description: 'Learn existential modal semantics through accessible witnesses.', prerequisiteChapterIds: ['how-to-play'], lessons: possibilityLessons, completionSummary: ['◇φ expresses existential quantification over accessible successors.', 'A witness must satisfy the operand and be accessible from the evaluation world.', 'Edge direction matters; truth elsewhere is insufficient.'], nextPreview: 'Next: Necessity — why one counterexample successor makes □φ false.', },
    { id: 'necessity', title: 'Necessity', description: 'Understand universal truth across accessible successors.', prerequisiteChapterIds: ['possibility'], lessons: [], completionSummary: [], },
    { id: 'nested-modalities', title: 'Nested Modalities', description: 'Follow successive accessibility steps.', prerequisiteChapterIds: ['necessity'], lessons: [], completionSummary: [], },
    { id: 'models-countermodels', title: 'Models and Countermodels', description: 'Construct models and countermodels.', prerequisiteChapterIds: ['nested-modalities'], lessons: [], completionSummary: [], },
    { id: 'semantic-scopes', title: 'Local, Global, and Frame Validity', description: 'Separate pointed truth, model truth, and frame validity.', prerequisiteChapterIds: ['models-countermodels'], lessons: [], completionSummary: [], },
    { id: 'frames-axioms', title: 'Frame Properties and Modal Axioms', description: 'Connect relational properties with modal axioms.', prerequisiteChapterIds: ['semantic-scopes'], lessons: [], completionSummary: [], },
  ],
}

export const learnLessons = learnCourse.chapters.flatMap((chapter) => chapter.lessons)
export const learnLessonByTaskId = new Map(learnLessons.flatMap((lesson) => [[lesson.task.id, lesson], ...(lesson.transferTask ? [[lesson.transferTask.id, lesson] as const] : [])]))
