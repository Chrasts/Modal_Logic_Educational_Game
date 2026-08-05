import type { ConstructionConstraints, FramePropertyName, ObjectiveScope } from './logic'

export type LevelEditPermission = 'worlds' | 'valuations' | 'edges' | 'constraints' | 'evaluation'
export type TutorialControl = 'worlds' | 'valuations' | 'edges' | 'evaluation' | 'history'
export type ObjectiveKind = 'semantic' | 'construction'

export interface WorkspacePresentation {
  readonly worlds?: boolean
  readonly valuations?: boolean
  readonly edges?: boolean
  readonly evaluation?: boolean
  /** Authored, learner-facing guardrails. Raw implementation bounds stay hidden. */
  readonly visibleConstraints?: readonly string[]
}

export interface GameLevel {
  readonly id: string
  readonly chapter: string
  readonly title: string
  readonly concept: string
  readonly learningObjective?: string
  readonly prediction?: {
    readonly kind: 'truth' | 'counterexample-world' | 'frame-property' | 'countervaluation' | 'model-choice' | 'world-choice'
    readonly prompt: string
    readonly expectedProperty?: FramePropertyName
    readonly propertyChoices?: readonly FramePropertyName[]
    readonly mustBeCorrect?: boolean
    readonly expectedChoice?: string
    readonly countervaluationChoices?: readonly {
      readonly id: string
      readonly valuation: Readonly<Record<string, readonly string[]>>
    }[]
    readonly modelChoices?: readonly {
      readonly id: string
      readonly worlds: readonly { readonly id: string; readonly atoms: string }[]
      readonly edges: readonly { readonly from: string; readonly to: string }[]
      readonly evaluationWorld: string
    }[]
    readonly worldChoices?: readonly string[]
  }
  readonly briefing?: string
  /** Progressive strategic guidance for guided campaigns. */
  readonly hints?: readonly [string, string, string]
  /** A concise post-success explanation of the construction. */
  readonly successDebrief?: string
  /** Optional high-level decomposition, without revealing a concrete construction. */
  readonly targetAnalysis?: readonly string[]
  /** One validated construction, revealed separately from ordinary hints. */
  readonly referenceSolution?: {
    readonly worlds: readonly { readonly id: string; readonly atoms: string; readonly position: { readonly x: number; readonly y: number } }[]
    readonly edges: readonly { readonly from: string; readonly to: string }[]
    readonly evaluationWorld: string
  }
  readonly instruction: string
  /** Semantic objectives retain the existing formula/scope fields. */
  readonly objectiveKind?: ObjectiveKind
  readonly formula?: string
  readonly comparisonFormula?: string
  /** Require exact truth values for Formula A and Formula B at the objective scope. */
  readonly comparisonTarget?: { readonly formulaATruth: boolean; readonly formulaBTruth: boolean }
  readonly scope?: ObjectiveScope
  readonly targetTruth?: boolean
  readonly evaluationWorld: string
  readonly correspondencePreset?: 't' | 'd' | 'b' | '4' | '5'
  readonly worlds: readonly {
    readonly id: string
    readonly atoms: string
    readonly position: { readonly x: number; readonly y: number }
  }[]
  readonly edges: readonly { readonly from: string; readonly to: string }[]
  readonly frameRules?: Partial<Record<FramePropertyName, 'off' | 'validate' | 'enforce'>>
  readonly requiredFrameRules?: Partial<Record<FramePropertyName, 'validate' | 'enforce'>>
  readonly constraints?: ConstructionConstraints
  /** Optional challenge evaluated only after the primary objective succeeds. */
  readonly bonusConstraints?: ConstructionConstraints
  readonly editable: readonly LevelEditPermission[]
  /** A UI-only construction check. Semantic objectives keep using the deterministic modal evaluator. */
  readonly structuralObjective?: { readonly requiredEvaluationWorld?: string }
  /** Explicitly controls the focused workspace used by introductory content. */
  readonly workspacePresentation?: WorkspacePresentation
  /** Controls deliberately exposed in the short How to Play flow. */
  readonly tutorialControls?: readonly TutorialControl[]
  /** Limits the atom vocabulary shown and accepted by a tutorial step. */
  readonly atomVocabulary?: readonly string[]
  /** Short, ordered UI instructions used only by the controls tutorial. */
  readonly taskSteps?: readonly string[]
}

export interface CampaignTrack {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly levels: readonly GameLevel[]
}

/** Construction objectives intentionally carry no semantic formula or target. */
export const isConstructionLevel = (level: GameLevel): boolean => level.objectiveKind === 'construction'

/**
 * Keeps the backwards-compatible level shape while rejecting ambiguous objective
 * configurations at the boundary where authored level data is tested/loaded.
 */
export function validateLevelObjective(level: GameLevel): void {
  if (isConstructionLevel(level)) {
    if (level.formula !== undefined || level.scope !== undefined || level.targetTruth !== undefined) {
      throw new Error(`Construction objective "${level.id}" must not define semantic formula, scope, or truth target.`)
    }
    return
  }
  if (!level.formula || !level.scope || level.targetTruth === undefined) {
    throw new Error(`Semantic objective "${level.id}" requires formula, scope, and truth target.`)
  }
}

const legacyTutorialLevelDefinitions: readonly GameLevel[] = [
  {
    id: 'tutorial-evaluation', chapter: 'Tutorial', title: 'Evaluation world', concept: 'Truth at the selected world',
    learningObjective: 'Distinguish truth at a designated world from truth elsewhere in the same model.',
    briefing: 'The petrol outline marks the evaluation world used by a pointed objective. Select a world on the map, or use the Evaluation world control in the Verification panel.',
    instruction: 'Make p true at the evaluation world.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], editable: ['evaluation'],
  },
  {
    id: 'tutorial-add-world', chapter: 'Tutorial', title: 'Adding a world', concept: 'World controls',
    learningObjective: 'Construct the carrier set W by adding and positioning worlds.',
    briefing: 'Use + World above the map or + Add world in the Worlds and valuations panel. New worlds receive a unique default name and can be repositioned on the map.',
    instruction: 'Create a model with exactly three worlds.', formula: 'p ∨ ¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3 }, editable: ['worlds'],
  },
  {
    id: 'tutorial-valuation', chapter: 'Tutorial', title: 'Editing a valuation', concept: 'True atoms and ν',
    learningObjective: 'Read and edit the valuation ν at an individual world.',
    briefing: 'Edit the True atoms field in the Worlds and valuations panel or select a world on the map and use its inspector. Separate several atoms with spaces or commas.',
    instruction: 'Make p true at w0.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2 }, editable: ['valuations'],
  },
  {
    id: 'tutorial-add-relation', chapter: 'Tutorial', title: 'Accessibility', concept: 'R ⊆ W × W · M,w ⊨ ◇φ',
    learningObjective: 'Use accessibility to provide a witness world for a possibility formula.',
    briefing: 'A relation is a directed arrow between worlds. Create one by dragging between handles on the map or by using the Accessibility panel.',
    instruction: 'Make ◇p true at w0.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 75, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 265, y: 130 } }, { id: 'w2', atoms: 'q', position: { x: 455, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'],
  },
  {
    id: 'tutorial-remove-relation', chapter: 'Tutorial', title: 'Necessity and valuations', concept: 'M,w ⊨ □φ',
    learningObjective: 'Recognize that every accessible successor must satisfy the operand of □.',
    briefing: 'The arrows are already fixed. Use the valuation editor to make p true at every world accessible from w0.',
    instruction: 'Make □p true at w0 by changing the valuation.', formula: '□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 2, maximumEdges: 2, requiredEdges: [{ from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }] }, editable: ['valuations'],
  },
  {
    id: 'tutorial-global-model', chapter: 'Tutorial', title: 'Global truth in a model', concept: 'M ⊨ φ iff ∀w ∈ W: M,w ⊨ φ',
    learningObjective: 'Distinguish model-global truth under a fixed valuation from pointed truth.',
    briefing: 'In the game, “true globally in the model” checks every world while keeping the displayed valuation fixed. A single counterexample world makes the objective fail.',
    instruction: 'Make p ∨ ◇p true globally in M.', formula: 'p ∨ ◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 1 }, editable: ['edges'],
  },
  {
    id: 'tutorial-frame-constraint', chapter: 'Tutorial', title: 'Frames and global constraints', concept: 'F ⊨ φ iff ∀ν ∀w ∈ W: ⟨F,ν⟩,w ⊨ φ',
    learningObjective: 'Distinguish frame validity over all valuations from truth in one displayed model.',
    briefing: '“Valid on the frame” checks every world under every possible valuation, not only the atoms currently displayed. Constraints can validate a relational property or enforce its closure globally.',
    instruction: 'Globally enforce reflexivity and verify □p → p on the resulting frame.', formula: '□p → p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], requiredFrameRules: { reflexive: 'enforce' }, constraints: { minimumWorlds: 2, maximumWorlds: 2 }, editable: ['constraints'],
  },
  {
    id: 'tutorial-correspondence', chapter: 'Tutorial', title: 'Formula and relation', concept: 'F ⊨ p → □◇p iff R is symmetric',
    learningObjective: 'Compare validity of a modal axiom with its corresponding relational property on one finite frame.',
    briefing: 'A correspondence claim compares modal frame validity with a property of R. Verification reports F ⊨ φ, the relational condition, and their agreement on the current finite frame separately.',
    instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'b',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w0', to: 'w1' }], frameRules: { symmetric: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2 }, editable: ['edges'],
  },
  {
    id: 'tutorial-recap', chapter: 'Tutorial', title: 'Model-building recap', concept: 'Worlds, valuations, relations, and pointed truth together',
    learningObjective: 'Coordinate worlds, valuation, accessibility, and an evaluation point in one construction.',
    briefing: 'This recap combines the editor operations from the preceding lessons. Build the required three-world model, set its valuation, and choose exactly two accessibility edges.',
    instruction: 'Make ◇p ∧ □(p ∨ q) true at w0 using exactly three worlds and two relations.', formula: '◇p ∧ □(p ∨ q)', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }],
    edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['worlds', 'valuations', 'edges', 'evaluation'],
  },
  {
    id: 'tutorial-accessibility', chapter: 'Tutorial', title: 'Drawing accessibility', concept: 'R is a directed binary relation on W',
    learningObjective: 'Create and read the direction of an accessibility edge independently of modal evaluation.',
    briefing: 'Draw one directed edge by dragging between world handles or by using the Accessibility panel. The source and target order matters.',
    instruction: 'Create exactly one accessibility edge from w0 to w1.', formula: 'p ∨ ¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'],
  },
  {
    id: 'tutorial-nested-modalities', chapter: 'Tutorial', title: 'Nested modalities', concept: 'Modal depth follows successive accessibility steps',
    learningObjective: 'Evaluate a nested possibility by following two successive accessibility steps.',
    briefing: 'Before verification, predict the truth value of the completed construction. The evaluation tree will then expose both modal steps.',
    instruction: 'Make ◇◇p true at w0 using exactly two edges.', formula: '◇◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
    prediction: { kind: 'truth', prompt: 'Will ◇◇p be true at w0 in your completed model?' },
    worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: 'p', position: { x: 450, y: 130 } }],
    edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['edges'],
  },
  {
    id: 'tutorial-local-countermodel', chapter: 'Tutorial', title: 'Locate a counterexample', concept: 'One failing world refutes model-global truth',
    learningObjective: 'Construct and identify a world witnessing failure of a model-global formula.',
    briefing: 'A model-global objective fails as soon as one world falsifies the formula. Predict that counterexample world before verification.',
    instruction: 'Remove one edge so □p → p is false somewhere in the model.', formula: '□p → p', scope: 'model', targetTruth: false, evaluationWorld: 'w0',
    prediction: { kind: 'counterexample-world', prompt: 'Which world will falsify □p → p?' },
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w0', to: 'w0' }, { from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'],
  },
  {
    id: 'tutorial-relational-property', chapter: 'Tutorial', title: 'Relational properties', concept: 'Frame constraints are properties of R',
    learningObjective: 'Repair a relation so that it satisfies symmetry independently of the displayed valuation.',
    briefing: 'Validate checks a property without changing the relation. A directed edge is symmetric only when its reverse edge is present.',
    instruction: 'Make the relation symmetric while retaining the required edge.', formula: 'p → p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w0', to: 'w1' }], frameRules: { symmetric: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredEdges: [{ from: 'w0', to: 'w1' }], maximumEdges: 2 }, editable: ['edges'],
  },
]

export const legacyTutorialLevelIds = [
  'tutorial-valuation',
  'tutorial-evaluation',
  'tutorial-add-world',
  'tutorial-accessibility',
  'tutorial-add-relation',
  'tutorial-remove-relation',
  'tutorial-nested-modalities',
  'tutorial-local-countermodel',
  'tutorial-global-model',
  'tutorial-frame-constraint',
  'tutorial-relational-property',
  'tutorial-correspondence',
  'tutorial-recap',
] as const

const legacyTutorialLevels: readonly GameLevel[] = legacyTutorialLevelIds.map((id) => {
  const level = legacyTutorialLevelDefinitions.find((candidate) => candidate.id === id)
  if (!level) throw new Error(`Unknown tutorial level: ${id}`)
  return level
})

/**
 * Version 2 of How to Play intentionally replaces the former semantic course.
 * The old IDs remain out of this list so old tutorial completions never mark an
 * unrelated new control step as done; non-tutorial progress is migrated by App.
 */
export const tutorialLevels: readonly GameLevel[] = [
  {
    id: 'tutorial-v2-evaluation-world', chapter: 'How to Play', title: 'Choose the evaluation world', concept: 'World selection',
    learningObjective: 'Select a world and set it as the evaluation world.',
    briefing: 'Click w1 to inspect it, then choose Set as evaluation world.',
    successDebrief: 'Formulas are evaluated relative to a selected world.',
    instruction: 'Make w1 the evaluation world.', objectiveKind: 'construction', evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
    edges: [], editable: ['evaluation'], structuralObjective: { requiredEvaluationWorld: 'w1' }, workspacePresentation: { evaluation: true }, tutorialControls: ['evaluation'], atomVocabulary: ['p'],
    taskSteps: ['Select w1.', 'Set it as the evaluation world.', 'Check task.'],
  },
  {
    id: 'tutorial-v2-valuation', chapter: 'How to Play', title: 'Edit a world valuation', concept: 'Atoms in a world',
    learningObjective: 'Add an atom to the valuation of a selected world.',
    briefing: 'Select w0 and add q to its valuation. Other atoms may remain.',
    successDebrief: 'Atoms written inside a world are true at that world.',
    instruction: 'Add q to w0.', objectiveKind: 'construction', evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 130 } }], edges: [], constraints: { requiredAtoms: { w0: ['q'] } },
    editable: ['valuations'], structuralObjective: {}, workspacePresentation: { valuations: true }, tutorialControls: ['valuations'],
    taskSteps: ['Select w0.', 'Add q to True atoms.', 'Check task.'],
  },
  {
    id: 'tutorial-v2-draw-edge', chapter: 'How to Play', title: 'Draw an accessibility edge', concept: 'Directed arrows',
    learningObjective: 'Create a directed accessibility edge.',
    briefing: 'Drag from the bottom/source handle of the world where the arrow begins to the top/target handle of its destination. Reversing source and target reverses the arrow.',
    successDebrief: 'Accessibility is directional: w0 → w1 is different from w1 → w0.',
    instruction: 'Draw an arrow from w0 to w1.', objectiveKind: 'construction', evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
    edges: [], constraints: { requiredEdges: [{ from: 'w0', to: 'w1' }] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true }, tutorialControls: ['edges'], atomVocabulary: ['p'],
    taskSteps: ['Start at the bottom/source handle of w0.', 'Drag to the top/target handle of w1.', 'Check task.'],
  },
  {
    id: 'tutorial-v2-correct-edge', chapter: 'How to Play', title: 'Correct an edge', concept: 'Editing arrows',
    learningObjective: 'Select, delete, and redraw a directed edge.',
    briefing: 'Select the existing arrow and delete it. Then draw the arrow in the opposite direction.',
    successDebrief: 'Select an edge to edit or delete it.',
    instruction: 'Replace w1 → w0 with w0 → w1.', objectiveKind: 'construction', evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
    edges: [{ from: 'w1', to: 'w0' }], constraints: { minimumEdges: 1, maximumEdges: 1, requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenEdges: [{ from: 'w1', to: 'w0' }] },
    editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true }, tutorialControls: ['edges'], atomVocabulary: ['p'],
    taskSteps: ['Select and delete w1 → w0.', 'Draw w0 → w1.', 'Check task.'],
  },
  {
    id: 'tutorial-v2-add-world', chapter: 'How to Play', title: 'Add a world', concept: 'Extending a model',
    learningObjective: 'Add a world and assign a valuation to it.',
    briefing: 'Use + World, select the new world, and add p to its valuation.',
    successDebrief: 'Models can be extended by adding worlds and assigning their valuations.',
    instruction: 'Add one new world and make p true there.', objectiveKind: 'construction', evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 130 } }], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredAtoms: { w1: ['p'] } },
    editable: ['worlds', 'valuations'], structuralObjective: {}, workspacePresentation: { worlds: true, valuations: true }, tutorialControls: ['worlds', 'valuations'], atomVocabulary: ['p'],
    taskSteps: ['Add one world.', 'Add p to the new world.', 'Check task.'],
  },
  {
    id: 'tutorial-v2-build-model', chapter: 'How to Play', title: 'Build a small model', concept: 'Worlds, valuations, and relations',
    learningObjective: 'Combine the basic model-building controls.',
    briefing: 'Add a second world, make p true there, then draw w0 → w1. Undo and redo are available from the map toolbar.',
    successDebrief: 'You can now build the basic parts of a Kripke model: worlds, valuations, and accessibility relations.',
    instruction: 'Create a second world, make p true there, and draw w0 → w1.', objectiveKind: 'construction', evaluationWorld: 'w0',
    worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredAtoms: { w1: ['p'] }, requiredEdges: [{ from: 'w0', to: 'w1' }] },
    editable: ['worlds', 'valuations', 'edges'], structuralObjective: {}, workspacePresentation: { worlds: true, valuations: true, edges: true }, tutorialControls: ['worlds', 'valuations', 'edges', 'history'], atomVocabulary: ['p'],
    taskSteps: ['Add w1 and make p true there.', 'Draw w0 → w1.', 'Check task.'],
  },
]

export const campaignTracks: readonly CampaignTrack[] = [
  {
    id: 'local', title: 'Local Models & Countermodels',
    description: 'Satisfy or refute formulas at a designated world under structural restrictions.',
    levels: [
      {
        id: 'local-necessary-not-actual', chapter: 'Local Models', title: 'Necessary, not actual', concept: 'Pointed satisfiability under seriality',
        instruction: 'Make □p ∧ ¬p true at w0.', formula: '□p ∧ ¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 3 }, editable: ['edges'],
      },
      {
        id: 'local-distribution-countermodel', chapter: 'Local Models', title: 'Split the alternatives', concept: 'Countermodel construction',
        instruction: 'Make □(p ∨ q) → (□p ∨ □q) false at w0.', formula: '□(p ∨ q) → (□p ∨ □q)', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: 'q', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 3 }, editable: ['edges'],
      },
      {
        id: 'local-contingent-possibility', chapter: 'Local Models', title: 'Open alternatives', concept: 'Two existential witnesses',
        instruction: 'Make ◇p ∧ ◇¬p true at w0.', formula: '◇p ∧ ◇¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'local-uniform-branching', chapter: 'Local Models', title: 'Uniform branching', concept: 'Existential witnesses under a universal condition',
        instruction: 'Make ◇(p ∧ q) ∧ ◇(p ∧ ¬q) ∧ □p true at w0.', formula: '◇(p ∧ q) ∧ ◇(p ∧ ¬q) ∧ □p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 60 } }, { id: 'w1', atoms: 'p q', position: { x: 90, y: 230 } }, { id: 'w2', atoms: 'p', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 3 }, bonusConstraints: { maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'local-one-change-repair', chapter: 'Local Models', title: 'One-change repair', concept: 'Minimal semantic repair',
        learningObjective: 'Repair a failed necessity claim while distinguishing relation edits from valuation edits.',
        briefing: 'A semantic change is one added or removed world, explicit edge, or atom membership. Moving a world is visual only and does not count.',
        instruction: 'Make box p true at w0 using at most one semantic change.', formula: 'box p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 60 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumChanges: 1 }, editable: ['valuations', 'edges'],
      },
      {
        id: 'local-compare-candidates', chapter: 'Local Models', title: 'Compare candidate models', concept: 'Semantic comparison across models',
        learningObjective: 'Evaluate the same pointed modal formula on two explicitly presented candidate models.',
        instruction: 'Choose the candidate model in which diamond p is true at w0.', formula: 'p -> p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        prediction: {
          kind: 'model-choice', prompt: 'In which candidate is diamond p true at w0?', expectedChoice: 'A', mustBeCorrect: true,
          modelChoices: [
            { id: 'A', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [{ from: 'w0', to: 'w1' }] },
            { id: 'B', evaluationWorld: 'w0', worlds: [{ id: 'w0', atoms: '' }, { id: 'w1', atoms: 'p' }], edges: [] },
          ],
        },
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 130 } }], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0 }, editable: [],
      },
    ],
  },
  {
    id: 'global', title: 'Global Model Building',
    description: 'Construct relations that make formulas hold throughout a model under a fixed valuation.',
    levels: [
      {
        id: 'global-persistence', chapter: 'Global Models', title: 'Persistence of truth', concept: 'Global implication',
        instruction: 'Make p → □p true at every world.', formula: 'p → □p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 100, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'global-possibility', chapter: 'Global Models', title: 'Universal possibility', concept: 'Global modal truth',
        instruction: 'Make ◇p true at every world.', formula: '◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 245, y: 70 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [], constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 4 }, editable: ['edges'],
      },
      {
        id: 'global-no-dead-ends', chapter: 'Global Models', title: 'No dead ends', concept: 'Global truth under seriality',
        instruction: 'Make □p → ◇p true at every world and satisfy the frame constraint.', formula: '□p → ◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'global-return-to-truth', chapter: 'Global Models', title: 'Return to truth', concept: 'Nested possibility under seriality',
        instruction: 'Make p → □◇p true globally and satisfy seriality.', formula: 'p → □◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 245, y: 60 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 4 }, bonusConstraints: { maximumEdges: 3 }, editable: ['edges'],
      },
    ],
  },
  {
    id: 'countervaluations', title: 'Countervaluations',
    description: 'Keep a defective frame fixed and expose the corresponding modal axiom with a valuation.',
    levels: [
      {
        id: 'witness-t', chapter: 'Countervaluations', title: 'Refute T', concept: 'Failure of reflexivity',
        instruction: 'Make □p → p false at w0.', formula: '□p → p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 245, y: 130 } }], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0, forbiddenAtoms: { w0: ['q'] } }, editable: ['valuations'],
      },
      {
        id: 'witness-b', chapter: 'Countervaluations', title: 'Refute B', concept: 'Failure of symmetry',
        instruction: 'Make p → □◇p false at w0.', formula: 'p → □◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredEdges: [{ from: 'w0', to: 'w1' }], forbiddenEdges: [{ from: 'w1', to: 'w0' }] }, editable: ['valuations'],
      },
      {
        id: 'witness-four', chapter: 'Countervaluations', title: 'Refute 4', concept: 'Failure of transitivity',
        instruction: 'Make □p → □□p false at w0.', formula: '□p → □□p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], forbiddenEdges: [{ from: 'w0', to: 'w2' }] }, editable: ['valuations'],
      },
      {
        id: 'witness-five', chapter: 'Countervaluations', title: 'Refute 5', concept: 'Failure of Euclideanness',
        instruction: 'Make ◇p → □◇p false at w0.', formula: '◇p → □◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 60 } }, { id: 'w1', atoms: '', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], maximumEdges: 2 }, bonusConstraints: { forbiddenAtoms: { w0: ['p'], w2: ['p'] } }, editable: ['valuations'],
      },
      {
        id: 'choose-countervaluation-t', chapter: 'Countervaluations', title: 'Choose a countervaluation', concept: 'Countervaluation as a concrete assignment',
        learningObjective: 'Identify a valuation that makes a modal formula false on a fixed pointed frame.',
        instruction: 'Choose the valuation that refutes box p -> p at w0.', formula: 'box p -> p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0',
        prediction: {
          kind: 'countervaluation', prompt: 'Which valuation makes box p -> p false at w0?', expectedChoice: 'A', mustBeCorrect: true,
          countervaluationChoices: [{ id: 'A', valuation: { w0: [] } }, { id: 'B', valuation: { w0: ['p'] } }],
        },
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 130 } }], edges: [], constraints: { minimumWorlds: 1, maximumWorlds: 1, maximumEdges: 0 }, editable: [],
      },
    ],
  },
  {
    id: 'engineering', title: 'Frame Engineering',
    description: 'Construct relations with required global properties and establish frame validity.',
    levels: [
      {
        id: 'frame-t', chapter: 'Frame Engineering', title: 'Reflexive foundation', concept: 'Axiom T on a frame',
        instruction: 'Make □p → p valid and satisfy the frame constraint.', formula: '□p → p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { reflexive: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'frame-d', chapter: 'Frame Engineering', title: 'Serial foundation', concept: 'Axiom D on a frame',
        instruction: 'Make □p → ◇p valid and satisfy the frame constraint.', formula: '□p → ◇p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'frame-s4', chapter: 'Frame Engineering', title: 'Build an S4 frame', concept: 'Reflexivity and transitivity',
        instruction: 'Satisfy both frame constraints and make □p → □□p valid.', formula: '□p → □□p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], frameRules: { reflexive: 'validate', transitive: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 6 }, editable: ['edges'],
      },
      {
        id: 'frame-s5', chapter: 'Frame Engineering', title: 'Build an S5 cluster', concept: 'Reflexivity, symmetry, and transitivity together',
        instruction: 'Complete the connected frame so all three frame constraints hold and axiom 5 is valid.', formula: '◇p → □◇p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], frameRules: { reflexive: 'validate', symmetric: 'validate', transitive: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], maximumEdges: 9 }, editable: ['edges'],
      },
      {
        id: 'frame-identify-symmetry', chapter: 'Frame Engineering', title: 'Diagnose the relation', concept: 'Identify a missing frame property',
        learningObjective: 'Distinguish symmetry from seriality and transitivity by inspecting a fixed relation.',
        instruction: 'Inspect the fixed frame and identify the property it lacks among the listed alternatives.', formula: 'p -> p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        prediction: { kind: 'frame-property', prompt: 'Which property fails: symmetry, transitivity, or seriality?', expectedProperty: 'symmetric', propertyChoices: ['symmetric', 'transitive', 'serial'], mustBeCorrect: true },
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 2, maximumEdges: 2 }, editable: [],
      },
    ],
  },
  {
    id: 'correspondence', title: 'Correspondence Lab',
    description: 'Compare standard modal axioms with their characteristic relational properties on finite frames.',
    levels: [
      {
        id: 'correspondence-t', chapter: 'Correspondence', title: 'T and reflexivity', concept: 'T ↔ reflexivity',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '□p → p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 't',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [], frameRules: { reflexive: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'correspondence-d', chapter: 'Correspondence', title: 'D and seriality', concept: 'D ↔ seriality',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '□p → ◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'd',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [], frameRules: { serial: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'correspondence-b', chapter: 'Correspondence', title: 'B and symmetry', concept: 'B ↔ symmetry',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'b',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }], frameRules: { symmetric: 'validate' }, constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'correspondence-four', chapter: 'Correspondence', title: '4 and transitivity', concept: '4 ↔ transitivity',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '□p → □□p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '4',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: '', position: { x: 450, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], frameRules: { transitive: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 3 }, editable: ['edges'],
      },
      {
        id: 'correspondence-five', chapter: 'Correspondence', title: '5 and Euclideanness', concept: '5 ↔ Euclidean relation',
        instruction: 'Satisfy the frame constraint and verify that both sides agree on this finite frame.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '5',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], frameRules: { euclidean: 'validate' }, constraints: { minimumWorlds: 3, maximumWorlds: 3, maximumEdges: 6 }, editable: ['edges'],
      },
      {
        id: 'correspondence-five-cluster', chapter: 'Correspondence', title: '5 on a larger cluster', concept: 'Euclidean closure with three alternatives',
        instruction: 'Complete the frame and verify that axiom 5 validity and Euclideanness agree on this finite instance.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '5',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 35 } }, { id: 'w1', atoms: 'p', position: { x: 40, y: 230 } }, { id: 'w2', atoms: '', position: { x: 245, y: 270 } }, { id: 'w3', atoms: '', position: { x: 450, y: 230 } }],
        edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' }], frameRules: { euclidean: 'validate' }, constraints: { minimumWorlds: 4, maximumWorlds: 4, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w0', to: 'w3' }], maximumEdges: 12 }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-t', chapter: 'Correspondence', title: 'Break reflexivity', concept: 'A failed frame condition produces a countervaluation to T',
        instruction: 'Remove one loop so the frame is not reflexive and T is not valid.', formula: '□p → p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 't',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [{ from: 'w0', to: 'w0' }, { from: 'w1', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 1, forbiddenProperties: ['reflexive'] }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-b', chapter: 'Correspondence', title: 'Break symmetry', concept: 'A one-way edge produces a countervaluation to B',
        instruction: 'Remove the reverse edge so the frame is not symmetric and B is not valid.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: 'b',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w0' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, requiredEdges: [{ from: 'w0', to: 'w1' }], maximumEdges: 1, forbiddenProperties: ['symmetric'] }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-four', chapter: 'Correspondence', title: 'Break transitivity', concept: 'A missing shortcut produces a countervaluation to 4',
        instruction: 'Remove the shortcut while retaining the path so transitivity and axiom 4 both fail.', formula: '□p → □□p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '4',
        worlds: [{ id: 'w0', atoms: '', position: { x: 70, y: 130 } }, { id: 'w1', atoms: '', position: { x: 260, y: 130 } }, { id: 'w2', atoms: 'p', position: { x: 450, y: 130 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w0', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w1', to: 'w2' }], maximumEdges: 2, forbiddenProperties: ['transitive'] }, editable: ['edges'],
      },
      {
        id: 'correspondence-break-five', chapter: 'Correspondence', title: 'Break Euclideanness', concept: 'A bare fork produces a countervaluation to 5',
        instruction: 'Remove the cluster edges while retaining the fork so Euclideanness and axiom 5 both fail.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: '5',
        worlds: [{ id: 'w0', atoms: '', position: { x: 245, y: 70 } }, { id: 'w1', atoms: 'p', position: { x: 90, y: 230 } }, { id: 'w2', atoms: '', position: { x: 400, y: 230 } }], edges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }, { from: 'w1', to: 'w1' }, { from: 'w1', to: 'w2' }, { from: 'w2', to: 'w1' }, { from: 'w2', to: 'w2' }], constraints: { minimumWorlds: 3, maximumWorlds: 3, requiredEdges: [{ from: 'w0', to: 'w1' }, { from: 'w0', to: 'w2' }], maximumEdges: 2, forbiddenProperties: ['euclidean'] }, editable: ['edges'],
      },
    ],
  },
  {
    id: 'equivalence', title: 'Formula Equivalence Lab',
    description: 'Make two formulas agree locally, throughout a displayed model, or under every valuation on a frame.',
    levels: [
      {
        id: 'equivalence-pointed-repair', chapter: 'Equivalence', title: 'Agreement at one world', concept: 'Pointed formula equivalence',
        learningObjective: 'Distinguish agreement at the evaluation world from agreement elsewhere.',
        instruction: 'Make box p and p have the same truth value at w0.', formula: 'box p', comparisonFormula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 100, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
        edges: [{ from: 'w0', to: 'w1' }], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumChanges: 1 }, editable: ['valuations', 'edges'],
      },
      {
        id: 'equivalence-model-diamond', chapter: 'Equivalence', title: 'Agreement throughout M', concept: 'Model-global equivalence under a fixed valuation',
        learningObjective: 'Make two formulas agree at every world while retaining the displayed valuation.',
        instruction: 'Make diamond p and p equivalent throughout the model.', formula: 'diamond p', comparisonFormula: 'p', scope: 'model', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: 'p', position: { x: 100, y: 130 } }, { id: 'w1', atoms: '', position: { x: 390, y: 130 } }],
        edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
      {
        id: 'equivalence-frame-identity', chapter: 'Equivalence', title: 'Agreement under every valuation', concept: 'Frame equivalence',
        learningObjective: 'Distinguish frame equivalence from agreement under one displayed valuation.',
        instruction: 'Make box p and p equivalent under every valuation on the frame.', formula: 'box p', comparisonFormula: 'p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0',
        worlds: [{ id: 'w0', atoms: '', position: { x: 100, y: 130 } }, { id: 'w1', atoms: 'p', position: { x: 390, y: 130 } }],
        edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, maximumEdges: 2 }, editable: ['edges'],
      },
    ],
  },
]
