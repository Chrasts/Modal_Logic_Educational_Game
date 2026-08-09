import { chapter, edge, hints, lesson, w } from './shared'

const worlds = [w('w0', '', 60), w('w1', '', 280, 60), w('w2', '', 280, 210)]

const lessons = [
  lesson('frame-properties', 'frames-reflexive', 'Reflexivity', 'Repair a relation so every world accesses itself.',
    { heading: 'Reflexivity requires every self-loop', intuitive: 'For every world w, the pair wRw must belong to the relation.', formal: '∀w: wRw', keyPoints: ['Valuations are irrelevant.', 'Inspect every diagonal pair.'] },
    { instruction: 'Make the frame reflexive.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds, edges: [edge('w0', 'w0')], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 3, maximumEdges: 3, requiredProperties: ['reflexive'] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true, visibleConstraints: ['Every world must access itself.'] } },
    hints('w0 already has its loop.', 'w1 and w2 each need a self-loop.', 'Add w1 → w1 and w2 → w2.'), 'Every world now accesses itself.'),

  lesson('frame-properties', 'frames-serial', 'Seriality', 'Ensure that every world has at least one successor.',
    { heading: 'Serial frames have no dead ends', intuitive: 'Each world must have some outgoing edge, but it need not be a self-loop.', formal: '∀w∃v: wRv', keyPoints: ['w0 and w1 already have successors.', 'Only w2 is a dead end.'] },
    { instruction: 'Make the frame serial by adding exactly one edge.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds, edges: [edge('w0', 'w1'), edge('w1', 'w2')], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 3, maximumEdges: 3, requiredProperties: ['serial'] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true, visibleConstraints: ['Every world must have at least one successor.'] } },
    hints('Find the only world without an outgoing edge.', 'Its new target can be any existing world.', 'Add w2 → w0, w2 → w1, or w2 → w2.'), 'Every world now has at least one successor.'),

  lesson('frame-properties', 'frames-symmetric', 'Symmetry', 'Add the reverse of every directed edge.',
    { heading: 'Symmetry pairs every arrow with its reverse', intuitive: 'If w reaches v, then v must reach w.', formal: '∀w∀v: wRv → vRw', keyPoints: ['Check both initial edges.', 'Self-loops reverse themselves.'] },
    { instruction: 'Make the frame symmetric.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds, edges: [edge('w0', 'w1'), edge('w1', 'w2')], constraints: { minimumEdges: 4, maximumEdges: 4, requiredProperties: ['symmetric'] }, editable: ['edges'], structuralObjective: {} },
    hints('Reverse w0 → w1.', 'Reverse w1 → w2 as well.', 'Add w1 → w0 and w2 → w1.'), 'Every accessibility arrow now has its reverse.'),

  lesson('frame-properties', 'frames-transitive', 'Transitivity', 'Complete a length-two accessibility path.',
    { heading: 'Transitivity closes two-step paths', intuitive: 'Whenever w reaches v and v reaches u, w must reach u directly.', formal: 'wRv ∧ vRu → wRu', keyPoints: ['Find the length-two path.', 'Add its shortcut.'] },
    { instruction: 'Make the frame transitive.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds, edges: [edge('w0', 'w1'), edge('w1', 'w2')], constraints: { minimumEdges: 3, maximumEdges: 3, requiredProperties: ['transitive'] }, editable: ['edges'], structuralObjective: {} },
    hints('Follow w0 → w1 → w2.', 'Transitivity requires a direct shortcut.', 'Add w0 → w2.'), 'The length-two path now has its required shortcut.'),

  lesson('frame-properties', 'frames-euclidean', 'Euclidean relation', 'Complete the pairs required between co-successors.',
    { heading: 'Co-successors must access one another', intuitive: 'If a world reaches two targets, the first target must reach the second.', formal: 'wRv ∧ wRu → vRu', keyPoints: ['w1 and w2 are both targets of w0.', 'Both ordered cross-pairs are required.'] },
    { instruction: 'Make the relation Euclidean.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds, edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w1'), edge('w2', 'w2')], constraints: { minimumEdges: 6, maximumEdges: 6, requiredProperties: ['euclidean'] }, editable: ['edges'], structuralObjective: {} },
    hints('Compare the two targets of w0.', 'They already reach themselves but not each other.', 'Add w1 → w2 and w2 → w1.'), 'The two targets of w0 now access each other, completing the required Euclidean pairs.'),

  lesson('frame-properties', 'frames-combination', 'Combine and separate properties', 'Satisfy reflexivity and symmetry without making the frame transitive.',
    { heading: 'Frame properties can combine independently', intuitive: 'Repair the missing reverse edge while preserving a missing transitive shortcut.', keyPoints: ['All self-loops are present.', 'w1 → w2 lacks its reverse.', 'Do not add w0 → w2.'] },
    { instruction: 'Add one edge so the frame is reflexive and symmetric but still not transitive.', objectiveKind: 'construction', evaluationWorld: 'w0', worlds, edges: [edge('w0', 'w0'), edge('w1', 'w1'), edge('w2', 'w2'), edge('w0', 'w1'), edge('w1', 'w0'), edge('w1', 'w2')], constraints: { minimumEdges: 7, maximumEdges: 7, requiredProperties: ['reflexive', 'symmetric'], forbiddenProperties: ['transitive'] }, editable: ['edges'], structuralObjective: {}, workspacePresentation: { edges: true, visibleConstraints: ['The frame must be reflexive and symmetric, but not transitive.'] } },
    hints('Reflexivity already holds.', 'Symmetry is missing the reverse of w1 → w2.', 'Add w2 → w1; leave w0 → w2 absent.'), 'The frame is reflexive and symmetric, while the missing w0 → w2 and w2 → w0 keep it non-transitive.'),
]

export const framePropertiesChapter = chapter('frame-properties', 'Frame Properties', 'Recognize and repair structural properties of accessibility relations.', ['models-countermodels'], lessons, ['Frame properties concern only the accessibility relation, not the current valuation.', 'Reflexivity, seriality, symmetry, transitivity, and Euclideanness impose different structural conditions.', 'A frame can satisfy some properties while failing others.', 'A finite instance check is evidence about that frame, not a general correspondence proof.'])
