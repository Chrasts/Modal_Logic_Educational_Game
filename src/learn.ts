import type { GameLevel } from './campaign'

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

// Prediction metadata is retained in older authored task data for compatibility,
// but introductory campaigns now open directly in the shared workspace.
const possibilityLessons: readonly LearnLesson[] = possibilityLessonDefinitions.map((lesson) => ({
  ...lesson,
  stages: lesson.stages.filter((stage) => stage !== 'prediction'),
  task: {
    ...lesson.task,
    prediction: undefined,
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
    concept: { heading: 'Worlds form the carrier set', intuitive: 'A finite Kripke model begins with a collection of worlds.', formal: 'W is the set of worlds.', keyPoints: ['The model currently has w0.', 'Add one more world.'] },
    task: { id: 'learn-worlds-add-task', chapter: 'Worlds and Accessibility', title: 'Add a world', concept: 'Carrier set', learningObjective: 'Add exactly one new world.', briefing: 'Use + World or + Add world once.', instruction: 'Add exactly one new world.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 220, 130)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 0 }, editable: ['worlds'], structuralObjective: {}, workspacePresentation: { worlds: true } }, hints: ['Look for the + World control.', 'The task needs two worlds total.', 'Add one world and verify.'], successExplanation: 'The model now has two worlds.',
  },
  {
    id: 'learn-worlds-directed-edge', chapterId: 'worlds-accessibility', title: 'Directed accessibility', learningObjective: 'Understand that accessibility is a directed binary relation.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'An arrow is an ordered pair', intuitive: 'w0 → w1 says w0 can access w1; it says nothing about the reverse direction.', formal: 'R ⊆ W × W.', keyPoints: ['Edges have a source and target.', 'The arrow points from w0 to w1.'] },
    task: { id: 'learn-worlds-directed-edge-task', chapter: 'Worlds and Accessibility', title: 'Directed accessibility', concept: 'Directed relation', learningObjective: 'Draw w0 → w1.', briefing: 'Create one edge from w0 to w1.', instruction: 'Draw w0 → w1.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 100, 130), w('w1', '', 390, 130)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true } }, hints: ['Start at w0.', 'Drag to w1 or use the Accessibility panel.', 'The required pair is w0Rw1.'], successExplanation: 'w0 can access w1; this does not imply w1 can access w0.',
  },
  {
    id: 'learn-worlds-direction', chapterId: 'worlds-accessibility', title: 'Direction matters', learningObjective: 'Distinguish source and target.', stages: ['concept', 'task', 'feedback'],
    concept: { heading: 'Reverse the pair', intuitive: 'w1 → w0 is a different relation pair from w0 → w1.', keyPoints: ['The current edge points the wrong way.', 'Replace it rather than adding another edge.'] },
    task: { id: 'learn-worlds-direction-task', chapter: 'Worlds and Accessibility', title: 'Direction matters', concept: 'Edge direction', learningObjective: 'Replace w1 → w0 with w0 → w1.', briefing: 'Delete the current edge, then draw the reversed direction.', instruction: 'Replace w1 → w0 with w0 → w1.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds: [w('w0', '', 100, 130), w('w1', '', 390, 130)], edges: [{ from: 'w1', to: 'w0' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenEdges: [{ from: 'w1', to: 'w0' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true } }, hints: ['The relation currently contains w1Rw0.', 'Remove that pair.', 'Create w0Rw1.'], successExplanation: 'Accessibility is directional.',
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

export const learnCourse: LearnCourse = {
  id: 'learn-modal-logic', title: 'Intro to Modal Logic', description: 'Foundational campaigns in building and evaluating finite Kripke models.',
  chapters: [
    { id: 'truth-at-a-world', title: 'Truth at a World', description: 'Evaluate formulas at a designated world.', prerequisiteChapterIds: [], lessons: truthAtAWorldLessons, completionSummary: ['Formulas are evaluated relative to a selected world.', 'Atom truth is determined by valuation.', 'Negation reverses local truth and conjunction requires both conjuncts at one world.'], nextPreview: 'Next: Worlds and Accessibility.', },
    { id: 'worlds-accessibility', title: 'Worlds and Accessibility', description: 'Build worlds and directed accessibility relations.', prerequisiteChapterIds: ['truth-at-a-world'], lessons: worldsAndAccessibilityLessons, completionSummary: ['W is the set of worlds.', 'R is a directed binary relation.', 'Accessibility can branch and include self-loops.'], nextPreview: 'Next: Possibility.', },
    { id: 'possibility', title: 'Possibility', description: 'Learn existential modal semantics through accessible witnesses.', prerequisiteChapterIds: ['worlds-accessibility'], lessons: possibilityLessons, completionSummary: ['◇φ expresses existential quantification over accessible successors.', 'A witness must satisfy the operand and be accessible from the evaluation world.', 'Edge direction matters; truth elsewhere is insufficient.'], nextPreview: 'Next: Necessity — why one counterexample successor makes □φ false.', },
    { id: 'necessity', title: 'Necessity', description: 'Understand universal truth across accessible successors.', prerequisiteChapterIds: ['possibility'], lessons: [], completionSummary: [], },
    { id: 'nested-modalities', title: 'Box and Diamond', description: 'Combine possibility and necessity in modal formulas.', prerequisiteChapterIds: ['necessity'], lessons: [], completionSummary: [], },
    { id: 'models-countermodels', title: 'Models and Countermodels', description: 'Construct models and countermodels.', prerequisiteChapterIds: ['nested-modalities'], lessons: [], completionSummary: [], },
    { id: 'semantic-scopes', title: 'Local, Global, and Frame Validity', description: 'Separate pointed truth, model truth, and frame validity.', prerequisiteChapterIds: ['models-countermodels'], lessons: [], completionSummary: [], },
    { id: 'frames-axioms', title: 'Frame Properties and Modal Axioms', description: 'Connect relational properties with modal axioms.', prerequisiteChapterIds: ['semantic-scopes'], lessons: [], completionSummary: [], },
  ],
}

export const learnLessons = learnCourse.chapters.flatMap((chapter) => chapter.lessons)
export const learnLessonByTaskId = new Map(learnLessons.flatMap((lesson) => [[lesson.task.id, lesson], ...(lesson.transferTask ? [[lesson.transferTask.id, lesson] as const] : [])]))
