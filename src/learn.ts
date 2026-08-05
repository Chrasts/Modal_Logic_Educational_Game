import type { GameLevel } from './campaign'
import { necessityChapter } from './learn/necessity'
import { boxDiamondChapter } from './learn/box-diamond'
import { nestedModalitiesChapter } from './learn/nested-modalities'
import { semanticScopesChapter } from './learn/semantic-scopes'
import { countermodelsChapter } from './learn/countermodels'
import { framePropertiesChapter } from './learn/frame-properties'
import { modalAxiomsChapter } from './learn/modal-axioms'

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
  readonly relatedLessonIds?: readonly string[]
}

export interface ConceptQuestion {
  readonly prompt: string
  readonly choices: readonly string[]
  readonly correctChoice: string
  readonly explanation: string
}

export interface LearnChapter {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly prerequisiteChapterIds: readonly string[]
  readonly lessons: readonly LearnLesson[]
  readonly completionSummary: readonly string[]
  readonly recapQuestions?: readonly ConceptQuestion[]
  readonly nextPreview?: string
}

export interface LearnCourse {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly chapters: readonly LearnChapter[]
}

const w = (id: string, atoms: string, x: number, y: number) => ({ id, atoms, position: { x, y } })

const possibilityLessonDefinitions: readonly LearnLesson[] = [
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
    task: { id: 'learn-possibility-witness-task', chapter: 'Possibility', title: 'Finding a witness', concept: 'Witness identification', learningObjective: 'Select the accessible witness for ◇(p ∧ q).', instruction: 'Select the world that witnesses ◇(p ∧ q) at w0.', formula: '◇(p ∧ q)', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'Which accessible world witnesses ◇(p ∧ q) at w0?', expectedChoice: 'w3', worldChoices: ['w1', 'w2', 'w3'], mustBeCorrect: true }, worlds: [w('w0', '', 60, 130), w('w1', 'p', 270, 45), w('w2', 'q', 270, 130), w('w3', 'p q', 270, 215)], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' }], constraints: { minimumWorlds: 4, maximumWorlds: 4, minimumEdges: 3, maximumEdges: 3 }, editable: [] },
    hints: ['A witness for a conjunction must satisfy both conjuncts.', 'Compare the valuations of w1, w2, and w3.', 'Select w3: it is the accessible world where both p and q hold.'],
    successExplanation: 'w3 is an accessible witness because it satisfies both p and q. The other successors each satisfy only one conjunct.', commonMistake: 'Selecting a world that satisfies only one conjunct.',
  },
  {
    id: 'learn-possibility-accessibility', chapterId: 'possibility', title: 'Accessibility is required',
    learningObjective: 'Distinguish truth somewhere in a model from truth in an accessible alternative.', stages: ['concept', 'prediction', 'task', 'feedback'],
    concept: { heading: 'Truth elsewhere is not enough', intuitive: 'A p-world matters to ◇p at w0 only if w0 can access it.', formal: 'The existential witness v must satisfy both wRv and M,v ⊨ p.', formula: '◇p', keyPoints: ['p may be true somewhere in the model.', 'Without an outgoing edge from w0, it is not a witness.'] },
    task: { id: 'learn-possibility-accessibility-task', chapter: 'Possibility', title: 'Accessibility is required', concept: 'Accessible witness', learningObjective: 'Make the existing p-world accessible from w0 without changing the size of the relation.', instruction: 'Redirect the one outgoing edge so the existing p-world witnesses ◇p at w0.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 70, 130), w('w1', 'p', 390, 65), w('w2', '', 390, 205)], edges: [{ from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenEdges: [{ from: 'w0', to: 'w2' }] }, editable: ['edges'] },
    hints: ['Only accessible p-worlds can witness ◇p.', 'w2 is accessible but has no p; w1 has p but is not accessible.', 'Redirect w0 → w2 to w0 → w1.'],
    successExplanation: 'Redirecting the existing edge makes w1 relevant to evaluation at w0, while the inaccessible alternative no longer distracts from the witness.', diagnosticFeedback: { 'missing-diamond-witness': 'A p-world exists, but the outgoing edge from w0 still targets a world without p.' },
  },
  {
    id: 'learn-possibility-direction', chapterId: 'possibility', title: 'Direction of accessibility',
    learningObjective: 'Understand that a witness edge must point from the evaluation world to the witness world.', stages: ['concept', 'prediction', 'task', 'feedback'],
    concept: { heading: 'Accessibility is directional', intuitive: 'An arrow pointing into the current world does not make its source available from that world.', formal: 'For w1 to witness ◇p at w0, the relation must contain w0Rw1.', formula: '◇p', keyPoints: ['Arrow direction matters.', 'The witness must be reachable from the evaluation world.'] },
    task: { id: 'learn-possibility-direction-task', chapter: 'Possibility', title: 'Direction of accessibility', concept: 'Directional relation', learningObjective: 'Repair one orientation while preserving a second outgoing edge.', instruction: 'Reverse w1 → w0 so w1 witnesses ◇p, and keep w0 → w2.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 70, 130), w('w1', 'p', 390, 65), w('w2', '', 390, 205)], edges: [{ from: 'w1', to: 'w0' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], forbiddenEdges: [{ from: 'w1', to: 'w0' }] }, editable: ['edges'] },
    hints: ['Read ◇p from w0 outward.', 'Keep the edge from w0 to w2 unchanged.', 'Replace w1 → w0 with w0 → w1 while retaining exactly two edges.'],
    successExplanation: 'The repaired orientation makes w1 reachable from w0, while the second branch shows that unrelated edges can remain.', diagnosticFeedback: { 'missing-diamond-witness': 'The p-world still is not reachable from the evaluation world. Reverse only the edge between w0 and w1.' },
  },
  {
    id: 'learn-possibility-build', chapterId: 'possibility', title: 'Building a possibility model',
    learningObjective: 'Construct a model whose accessible witness satisfies a conjunction.', stages: ['concept', 'prediction', 'task', 'feedback', 'transfer'],
    concept: { heading: 'Build one complete witness', intuitive: 'For a possible conjunction, one accessible world must contain both facts; splitting them across alternatives is not enough.', formal: 'Choose v with w0Rv and M,v ⊨ p ∧ q.', formula: '◇(p ∧ q)', keyPoints: ['The distractor w1 has only p.', 'The same accessible world must satisfy p and q.'] },
    task: { id: 'learn-possibility-build-task', chapter: 'Possibility', title: 'Building a possibility model', concept: 'Possibility construction', learningObjective: 'Complete a three-world model with one conjunctive witness and exactly two edges.', instruction: 'Make ◇(p ∧ q) true at w0 using exactly the two outgoing edges shown by the target.', formula: '◇(p ∧ q)', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 70, 130), w('w1', 'p', 390, 65), w('w2', 'q', 390, 205)], edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2, requiredAtoms: { w1: ['p'], w2: ['p', 'q'] }, forbiddenAtoms: { w1: ['q'] }, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }] }, editable: ['valuations', 'edges'] },
    hints: ['w1 is an accessible distractor with only p.', 'w2 already has q and can become the complete witness.', 'Add p to w2 and draw w0 → w2, keeping w0 → w1.'],
    successExplanation: 'w2 is accessible and satisfies both conjuncts. w1 demonstrates why an accessible partial match is not enough.',
    transferTask: { id: 'learn-possibility-build-transfer', chapter: 'Possibility', title: 'Optional transfer: remove possibility', concept: 'Relation-only change', instruction: 'Keep the worlds and valuation, but make ◇p false by changing only the relation.', formula: '◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 100, 130), w('w1', 'p', 390, 130)], edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 1 }, editable: ['edges'] },
  },
]

// Keep authored predictions on conceptually significant tasks. They capture the
// learner's initial mental model before the first semantic verification.
const possibilityLessons: readonly LearnLesson[] = possibilityLessonDefinitions.map((lesson) => ({
  ...lesson,
  task: {
    ...lesson.task,
    workspacePresentation: lesson.task.workspacePresentation ?? {
      worlds: lesson.task.editable.includes('worlds'),
      valuations: lesson.task.editable.includes('valuations'),
      edges: lesson.task.editable.includes('edges'),
      evaluation: lesson.task.editable.includes('evaluation'),
    },
  },
}))

const truthAtAWorldLessons: readonly LearnLesson[] = [
  {
    id: 'learn-truth-atomic', chapterId: 'truth-at-a-world', title: 'Atomic truth',
    learningObjective: 'Understand that p is true at w exactly when p belongs to the valuation of w.',
    stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Truth starts with the valuation', intuitive: 'An atom is true at a world exactly when it appears in that world’s True atoms list.', formal: 'M,w ⊨ p iff w ∈ ν(p).', formula: 'p', keyPoints: ['Valuations belong to individual worlds.', 'Only the selected evaluation world matters for this task.'] },
    task: { id: 'learn-truth-atomic-task', chapter: 'Truth at a World', title: 'Atomic truth', concept: 'Atomic valuation', learningObjective: 'Make p true at w0.', briefing: 'Edit only the True atoms list for w0.', instruction: 'Make p true at w0.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 220, 130)], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0 }, editable: ['valuations'], workspacePresentation: { valuations: true } },
    hints: ['Look at the True atoms field for w0.', 'p is not assigned to w0 yet.', 'Add p to w0.'],
    successExplanation: 'p is true at w0 because p is assigned to w0.',
    diagnosticFeedback: { 'formula-false': 'p is true at w0 only when p is included in w0’s valuation.' },
  },
  {
    id: 'learn-truth-selected-world', chapterId: 'truth-at-a-world', title: 'Truth depends on the selected world',
    learningObjective: 'Distinguish truth at one world from truth elsewhere in the same model.',
    stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'The evaluation world matters', intuitive: 'The same formula can have different truth values at different worlds in one model.', formal: 'M,w ⊨ p depends on the chosen w.', formula: 'p', keyPoints: ['w0 has p.', 'w1 does not have p.'] },
    task: { id: 'learn-truth-selected-world-task', chapter: 'Truth at a World', title: 'Truth depends on the selected world', concept: 'World-relative truth', learningObjective: 'Make p false by selecting w1 as the evaluation world.', briefing: 'Do not change the model; change only the selected evaluation world.', instruction: 'Make p false at the evaluation world.', formula: 'p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', 'p', 100, 130), w('w1', '', 390, 130)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 0 }, editable: ['evaluation'], workspacePresentation: { evaluation: true } },
    hints: ['p is true at w0.', 'Find the world where p is absent.', 'Set w1 as the evaluation world.'],
    successExplanation: 'The same formula can be true at one world and false at another.',
  },
  {
    id: 'learn-truth-negation', chapterId: 'truth-at-a-world', title: 'Negation',
    learningObjective: 'Understand local negation.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Negation reverses local truth', intuitive: '¬p is true at a world when p is false at that same world.', formal: 'M,w ⊨ ¬p iff M,w ⊭ p.', formula: '¬p', keyPoints: ['Check p at w0.', 'Change only w0’s valuation.'] },
    task: { id: 'learn-truth-negation-task', chapter: 'Truth at a World', title: 'Negation', concept: 'Local negation', learningObjective: 'Make ¬p true at w0.', briefing: 'Remove p from w0; no other control is needed.', instruction: 'Make ¬p true at w0.', formula: '¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', 'p', 220, 130)], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0, forbiddenAtoms: { w0: ['p'] } }, editable: ['valuations'], workspacePresentation: { valuations: true } },
    hints: ['¬p is true when p is false.', 'p is currently assigned to w0.', 'Remove p from w0.'], successExplanation: '¬p is true at w0 because p is false there.',
  },
  {
    id: 'learn-truth-conjunction', chapterId: 'truth-at-a-world', title: 'Conjunction at one world',
    learningObjective: 'Understand that both conjuncts must hold at the same evaluation world.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Both facts must hold here', intuitive: 'A conjunction is true only when both of its parts are true at the selected world.', formal: 'M,w ⊨ p ∧ q iff M,w ⊨ p and M,w ⊨ q.', formula: 'p ∧ q', keyPoints: ['p already holds at w0.', 'Add q at the same world.'] },
    task: { id: 'learn-truth-conjunction-task', chapter: 'Truth at a World', title: 'Conjunction at one world', concept: 'Local conjunction', learningObjective: 'Make p ∧ q true at w0.', briefing: 'Keep p and add q to the valuation of w0.', instruction: 'Make p ∧ q true at w0.', formula: 'p ∧ q', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', 'p', 220, 130)], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0, requiredAtoms: { w0: ['p', 'q'] } }, editable: ['valuations'], workspacePresentation: { valuations: true } },
    hints: ['A conjunction needs both conjuncts.', 'p is already true at w0.', 'Add q to w0.'], successExplanation: 'p ∧ q is true because both p and q hold at w0.',
  },
  {
    id: 'learn-truth-same-model', chapterId: 'truth-at-a-world', title: 'Same model, different truth',
    learningObjective: 'Apply atomic truth, negation, and world-relative evaluation together.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Choose the world that fits the formula', intuitive: 'The model can contain different facts at different worlds; choose the one where both parts of the formula fit.', formula: 'p ∧ ¬q', keyPoints: ['w0 has p and not q.', 'w1 has q.'] },
    task: { id: 'learn-truth-same-model-task', chapter: 'Truth at a World', title: 'Same model, different truth', concept: 'World-relative evaluation', learningObjective: 'Choose the world where p ∧ ¬q is true.', briefing: 'Only the evaluation world is editable.', instruction: 'Make p ∧ ¬q true at the evaluation world.', formula: 'p ∧ ¬q', scope: 'pointed', targetTruth: true, evaluationWorld: 'w1', worlds: [w('w0', 'p', 100, 130), w('w1', 'q', 390, 130)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 0 }, editable: ['evaluation'], workspacePresentation: { evaluation: true } },
    hints: ['Find a world with p.', 'At that same world, q must be absent.', 'Set w0 as the evaluation world.'], successExplanation: 'At w0, p holds and q does not.',
  },
]

const worldsAndAccessibilityLessons: readonly LearnLesson[] = [
  {
    id: 'learn-worlds-add', chapterId: 'worlds-accessibility', title: 'Add a world', learningObjective: 'Understand the carrier set W as a finite collection of worlds.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Worlds form the carrier set', intuitive: 'A finite Kripke model begins with a collection of worlds.', formal: 'W is the set of worlds.', keyPoints: ['The model currently has w0.', 'Build a three-element carrier.'] },
    task: { id: 'learn-worlds-add-task', chapter: 'Worlds and Accessibility', title: 'Add a world', concept: 'Carrier set', learningObjective: 'Build the three-element carrier W = {w0,w1,w2}.', briefing: 'Use + World or + Add world twice.', instruction: 'Create exactly W = {w0,w1,w2}.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 220, 130)], edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 0 }, editable: ['worlds'], structuralObjective: {}, workspacePresentation: { worlds: true } }, hints: ['Look for the + World control.', 'The task needs three worlds total.', 'Add w1 and w2, then verify.'], successExplanation: 'The carrier now has three distinct worlds.',
  },
  {
    id: 'learn-worlds-directed-edge', chapterId: 'worlds-accessibility', title: 'Directed accessibility', learningObjective: 'Understand that accessibility is a directed binary relation.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'An arrow is an ordered pair', intuitive: 'A relation can contain several ordered pairs that form a directed path.', formal: 'R ⊆ W × W.', keyPoints: ['Edges have a source and target.', 'The target of the first pair becomes the source of the second.'] },
    task: { id: 'learn-worlds-directed-edge-task', chapter: 'Worlds and Accessibility', title: 'Directed accessibility', concept: 'Directed relation', learningObjective: 'Construct R = {(w0,w1),(w1,w2)}.', briefing: 'Create exactly the two ordered pairs in the target relation.', instruction: 'Create exactly w0 → w1 and w1 → w2.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 60, 130), w('w1', '', 260, 130), w('w2', '', 460, 130)], edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true } }, hints: ['Start with the ordered pair (w0,w1).', 'Continue the path with (w1,w2).', 'No other ordered pairs belong to the target relation.'], successExplanation: 'The accessibility relation is the two-pair directed path {(w0,w1),(w1,w2)}.',
  },
  {
    id: 'learn-worlds-direction', chapterId: 'worlds-accessibility', title: 'Direction matters', learningObjective: 'Distinguish source and target.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Orient a complete cycle', intuitive: 'A directed cycle returns to its start without including any reverse edge.', keyPoints: ['Keep w1 → w2 and w2 → w0.', 'Repair the remaining pair so every world has one outgoing edge.'] },
    task: { id: 'learn-worlds-direction-task', chapter: 'Worlds and Accessibility', title: 'Direction matters', concept: 'Edge direction', learningObjective: 'Repair a three-world relation into one oriented cycle.', briefing: 'Replace the wrong edge and preserve the other two pairs.', instruction: 'Create exactly the cycle w0 → w1 → w2 → w0.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 245, 35), w('w1', '', 80, 230), w('w2', '', 410, 230)], edges: [{ from: 'w1', to: 'w0' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w0' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 3, maximumEdges: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w0' }], forbiddenEdges: [{ from: 'w1', to: 'w0' }, { from: 'w2', to: 'w1' }, { from: 'w0', to: 'w2' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true } }, hints: ['Two sides of the cycle already point correctly.', 'Remove w1 → w0.', 'Add w0 → w1 and keep exactly three edges.'], successExplanation: 'The relation is an oriented three-world cycle with no reverse pairs.',
  },
  {
    id: 'learn-worlds-branching', chapterId: 'worlds-accessibility', title: 'Branching', learningObjective: 'Understand that one world can have multiple accessible successors.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'A relation can branch', intuitive: 'One world can access more than one alternative.', keyPoints: ['w0 is the shared source.', 'Both w1 and w2 are successors.'] },
    task: { id: 'learn-worlds-branching-task', chapter: 'Worlds and Accessibility', title: 'Branching', concept: 'Branching relation', learningObjective: 'Create two edges leaving w0.', briefing: 'Draw exactly w0 → w1 and w0 → w2.', instruction: 'Create exactly w0 → w1 and w0 → w2.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 80, 130), w('w1', '', 380, 60), w('w2', '', 380, 200)], edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true } }, hints: ['Both arrows start at w0.', 'Use w1 and w2 as separate targets.', 'There should be exactly two edges.'], successExplanation: 'The relation branches from w0 to two alternatives.',
  },
  {
    id: 'learn-worlds-reflexive-edge', chapterId: 'worlds-accessibility', title: 'Reflexive edge', learningObjective: 'Recognize a reflexive edge as a world accessing itself.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'A world may access itself', intuitive: 'A loop is an ordinary relation pair whose source and target are the same world.', formal: 'w0Rw0.', keyPoints: ['Keep the existing edge.', 'Add a loop at w0.'] },
    task: { id: 'learn-worlds-reflexive-edge-task', chapter: 'Worlds and Accessibility', title: 'Reflexive edge', concept: 'Self-loop', learningObjective: 'Add w0 → w0 while retaining w0 → w1.', briefing: 'Keep the existing arrow and add a self-loop at w0.', instruction: 'Add the self-loop w0 → w0 without removing the existing edge.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 100, 130), w('w1', '', 390, 130)], edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 2, maximumEdges: 2, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w0' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true } }, hints: ['Do not remove w0 → w1.', 'A self-loop begins and ends at w0.', 'Add w0 → w0.'], successExplanation: 'A self-loop represents w0Rw0.',
  },
]

const authoredLearnCourse: LearnCourse = {
  id: 'learn-modal-logic', title: 'Learn Modal Logic', description: 'Foundational lessons in building and evaluating finite Kripke models.',
  chapters: [
    { id: 'truth-at-a-world', title: 'Truth at a World', description: 'Evaluate formulas at a designated world.', prerequisiteChapterIds: [], lessons: truthAtAWorldLessons, completionSummary: ['Formulas are evaluated relative to a selected world.', 'Atom truth is determined by valuation.', 'Negation reverses local truth and conjunction requires both conjuncts at one world.'], nextPreview: 'Continue to Worlds and Accessibility.', recapQuestions: [
      { prompt: 'What makes p true at w?', choices: ['p belongs to the valuation at w', 'p holds somewhere in the model'], correctChoice: 'p belongs to the valuation at w', explanation: 'Atomic truth is local to the evaluated world.' },
      { prompt: 'Can p be true at w0 and false at w1 in one model?', choices: ['Yes', 'No'], correctChoice: 'Yes', explanation: 'Worlds may carry different valuations.' },
      { prompt: 'What does p ∧ q require?', choices: ['Both at the same world', 'p and q at any two worlds'], correctChoice: 'Both at the same world', explanation: 'Both conjuncts are evaluated at the current world.' },
    ] },
    { id: 'worlds-accessibility', title: 'Worlds and Accessibility', description: 'Build worlds and directed accessibility relations.', prerequisiteChapterIds: ['truth-at-a-world'], lessons: worldsAndAccessibilityLessons, completionSummary: ['W is the set of worlds.', 'R is a directed binary relation.', 'Accessibility can branch and include self-loops.'], nextPreview: 'Continue to Possibility.', recapQuestions: [
      { prompt: 'Does w0→w1 imply w1→w0?', choices: ['Yes', 'No'], correctChoice: 'No', explanation: 'Accessibility is directed unless symmetry is imposed.' },
      { prompt: 'What is a self-loop at w0?', choices: ['w0→w0', 'w0→w1'], correctChoice: 'w0→w0', explanation: 'A self-loop is the ordered pair (w0,w0).' },
      { prompt: 'Can one world have two successors?', choices: ['Yes', 'No'], correctChoice: 'Yes', explanation: 'A relation may branch.' },
    ] },
    { id: 'possibility', title: 'Possibility', description: 'Learn existential modal semantics through accessible witnesses.', prerequisiteChapterIds: ['worlds-accessibility'], lessons: possibilityLessons, completionSummary: ['◇φ expresses existential quantification over accessible successors.', 'A witness must satisfy the operand and be accessible from the evaluation world.', 'Edge direction matters; truth elsewhere is insufficient.'], nextPreview: 'Continue to Necessity.', recapQuestions: [
      { prompt: 'If ◇p is false, is □¬p true in standard Kripke semantics?', choices: ['Yes', 'No'], correctChoice: 'Yes', explanation: 'No accessible p-witness means every successor satisfies ¬p.' },
      { prompt: 'Does a p-world anywhere in the model witness ◇p at w0?', choices: ['Yes', 'Only if accessible from w0'], correctChoice: 'Only if accessible from w0', explanation: 'A witness must satisfy both accessibility and the operand.' },
      { prompt: 'How many witnesses does ◇p require?', choices: ['At least one', 'Every successor'], correctChoice: 'At least one', explanation: 'Diamond is existential.' },
    ] },
    necessityChapter,
    boxDiamondChapter,
    nestedModalitiesChapter,
    semanticScopesChapter,
    countermodelsChapter,
    framePropertiesChapter,
    modalAxiomsChapter,
  ],
}

// Authored remediation links are intentional curricular relationships, not a
// similarity score. Lessons without a suitable detour simply omit the action.
export const relatedLessonIdsByLessonId: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'learn-possibility-alternative': ['learn-possibility-accessibility'],
  'learn-possibility-witness': ['learn-possibility-alternative'],
  'learn-possibility-accessibility': ['learn-worlds-directed-edge'],
  'learn-possibility-direction': ['learn-worlds-direction'],
  'learn-necessity-one-successor': ['learn-possibility-alternative'],
  'learn-necessity-every-successor': ['learn-necessity-counterexample'],
  'learn-necessity-vacuous': ['learn-box-diamond-necessary-not-possible'],
  'learn-box-diamond-possible-not-necessary': ['learn-necessity-every-successor'],
  'learn-box-diamond-diamond-duality': ['learn-box-diamond-box-duality'],
  'learn-box-diamond-box-duality': ['learn-box-diamond-diamond-duality'],
  'learn-nested-double-diamond': ['learn-possibility-witness'],
  'learn-countermodels-relation': ['learn-necessity-counterexample'],
  'learn-countermodels-global': ['learn-scopes-local-not-global'],
  'learn-scopes-model': ['learn-truth-selected-world'],
  'learn-scopes-frame': ['learn-scopes-model'],
  'learn-scopes-comparison': ['learn-scopes-pointed'],
  'learn-frames-transitive': ['learn-nested-double-diamond'],
})

export const learnCourse: LearnCourse = {
  ...authoredLearnCourse,
  chapters: authoredLearnCourse.chapters.map((chapter) => ({
    ...chapter,
    lessons: chapter.lessons.map((lesson) => ({ ...lesson, relatedLessonIds: relatedLessonIdsByLessonId[lesson.id] })),
  })),
}

export const learnLessons = learnCourse.chapters.flatMap((chapter) => chapter.lessons)
export const learnCourseStats = Object.freeze({
  chapterCount: learnCourse.chapters.length,
  lessonCount: learnLessons.length,
})
export const learnLessonByTaskId = new Map(learnLessons.flatMap((lesson) => [[lesson.task.id, lesson], ...(lesson.transferTask ? [[lesson.transferTask.id, lesson] as const] : [])]))
