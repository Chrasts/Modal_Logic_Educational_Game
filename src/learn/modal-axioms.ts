import { chapter, edge, hints, lesson, w } from './shared'

const lessons = [
  lesson('modal-axioms', 'axioms-t', 'T and reflexivity', 'Connect axiom T with reflexivity on a finite frame.',
    { heading: 'T corresponds to reflexivity', intuitive: 'A self-loop makes every necessary p available at the same world.', formal: 'T: □p → p', formula: '□p → p', keyPoints: ['Check frame validity.', 'Check reflexivity separately.'] },
    { instruction: 'Repair the frame so it is reflexive and validates T.', formula: '□p → p', scope: 'correspondence', targetTruth: true, correspondencePreset: 't', evaluationWorld: 'w0', worlds: [w('w0'), w('w1', '', 390)], edges: [edge('w0', 'w1'), edge('w1', 'w1')], frameRules: { reflexive: 'validate' }, constraints: { minimumEdges: 3, maximumEdges: 3, requiredProperties: ['reflexive'] }, editable: ['edges'] },
    hints('w1 already accesses itself.', 'Reflexivity is missing only at w0.', 'Add w0 → w0.'), 'The repaired reflexive frame validates T under every valuation.'),

  lesson('modal-axioms', 'axioms-d', 'D and seriality', 'Connect axiom D with seriality on a finite frame.',
    { heading: 'D corresponds to seriality', intuitive: 'When every world has a successor, necessity supplies at least one possibility witness.', formal: 'D: □p → ◇p', formula: '□p → ◇p', keyPoints: ['Find the dead end.', 'Any outgoing edge repairs it.'] },
    { instruction: 'Repair the frame so it is serial and validates D.', formula: '□p → ◇p', scope: 'correspondence', targetTruth: true, correspondencePreset: 'd', evaluationWorld: 'w0', worlds: [w('w0'), w('w1', '', 390)], edges: [edge('w0', 'w1')], frameRules: { serial: 'validate' }, constraints: { minimumEdges: 2, maximumEdges: 2, requiredProperties: ['serial'] }, editable: ['edges'] },
    hints('w0 already has a successor.', 'w1 is the only dead end.', 'Add any outgoing edge from w1.'), 'The serial frame validates D under every valuation.'),

  lesson('modal-axioms', 'axioms-b', 'B and symmetry', 'Connect axiom B with symmetry on a finite frame.',
    { heading: 'B corresponds to symmetry', intuitive: 'If p holds here, every accessible world can return to a p-world.', formal: 'B: p → □◇p', formula: 'p → □◇p', keyPoints: ['Reverse the one arrow.', 'Then check every valuation.'] },
    { instruction: 'Repair the frame so it is symmetric and validates B.', formula: 'p → □◇p', scope: 'correspondence', targetTruth: true, correspondencePreset: 'b', evaluationWorld: 'w0', worlds: [w('w0'), w('w1', '', 390)], edges: [edge('w0', 'w1')], frameRules: { symmetric: 'validate' }, constraints: { minimumEdges: 2, maximumEdges: 2, requiredProperties: ['symmetric'] }, editable: ['edges'] },
    hints('The edge w0 → w1 lacks its reverse.', 'Symmetry requires both directions.', 'Add w1 → w0.'), 'The symmetric frame validates B under every valuation.'),

  lesson('modal-axioms', 'axioms-4', '4 and transitivity', 'Connect axiom 4 with transitivity on a finite frame.',
    { heading: '4 corresponds to transitivity', intuitive: 'A necessary fact remains necessary one step later when every two-step path has a shortcut.', formal: '4: □p → □□p', formula: '□p → □□p', keyPoints: ['Find the length-two path.', 'Add its shortcut.'] },
    { instruction: 'Repair the frame so it is transitive and validates 4.', formula: '□p → □□p', scope: 'correspondence', targetTruth: true, correspondencePreset: '4', evaluationWorld: 'w0', worlds: [w('w0', '', 40), w('w1', '', 270), w('w2', '', 500)], edges: [edge('w0', 'w1'), edge('w1', 'w2')], frameRules: { transitive: 'validate' }, constraints: { minimumEdges: 3, maximumEdges: 3, requiredProperties: ['transitive'] }, editable: ['edges'] },
    hints('Follow w0 → w1 → w2.', 'Transitivity requires the direct pair.', 'Add w0 → w2.'), 'The transitive frame validates axiom 4 under every valuation.'),

  lesson('modal-axioms', 'axioms-5', '5 and Euclideanness', 'Connect axiom 5 with the Euclidean property on a finite frame.',
    { heading: '5 corresponds to Euclideanness', intuitive: 'A possible witness remains possible from every co-successor when the targets access one another.', formal: '5: ◇p → □◇p', formula: '◇p → □◇p', keyPoints: ['w1 and w2 are co-successors.', 'Add both cross-pairs.'] },
    { instruction: 'Repair the frame so it is Euclidean and validates 5.', formula: '◇p → □◇p', scope: 'correspondence', targetTruth: true, correspondencePreset: '5', evaluationWorld: 'w0', worlds: [w('w0', '', 60), w('w1', '', 360, 60), w('w2', '', 360, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w1'), edge('w2', 'w2')], frameRules: { euclidean: 'validate' }, constraints: { minimumEdges: 6, maximumEdges: 6, requiredProperties: ['euclidean'] }, editable: ['edges'] },
    hints('The two targets of w0 already access themselves.', 'They must also access one another.', 'Add w1 → w2 and w2 → w1.'), 'The Euclidean frame validates axiom 5 under every valuation.'),

  lesson('modal-axioms', 'axioms-method', 'What the checker proves', 'State the methodological limit of a finite correspondence check.',
    { heading: 'A finite instance check is not a general proof', intuitive: 'The evaluator exhaustively checks this frame, not every frame of every size.', formula: '□p → p', keyPoints: ['All valuations on this finite frame are checked.', 'The relational property is checked directly.', 'The general theorem still needs proof.'] },
    { instruction: 'Select the correct interpretation of the finite correspondence check.', formula: '□p → p', scope: 'correspondence', targetTruth: true, correspondencePreset: 't', evaluationWorld: 'w0', worlds: [w('w0'), w('w1', '', 390)], edges: [edge('w0', 'w0'), edge('w0', 'w1'), edge('w1', 'w1')], frameRules: { reflexive: 'validate' }, prediction: { kind: 'statement-choice', prompt: 'What has this finite correspondence check established?', expectedChoice: 'finite-instance-not-general-proof', mustBeCorrect: true, statementChoices: [
      { id: 'displayed-valuation-only', label: 'Only that the formula is true under the currently displayed valuation.' },
      { id: 'finite-instance-not-general-proof', label: 'That the formula is valid on this finite frame and the frame is reflexive; this single check is not a proof of the general theorem.' },
      { id: 'general-proof', label: 'That the general correspondence theorem has now been proved.' },
    ] }, editable: [] },
    hints('The frame search does vary all valuations.', 'But it checks only this particular finite relation.', 'Choose the statement that distinguishes an exhaustive finite instance from a general proof.'), 'The checker exhaustively verifies this finite frame and its relational property. The general theorem requires a separate mathematical proof.'),
]

export const modalAxiomsChapter = chapter('modal-axioms', 'Modal Axioms and Correspondence', 'Connect frame properties with T, D, B, 4, and 5 on finite frames.', ['frame-properties'], lessons, ['T, D, B, 4, and 5 correspond to reflexivity, seriality, symmetry, transitivity, and Euclideanness.', 'The game can exhaustively check a particular finite frame.', 'A successful instance check is not by itself a proof of the general correspondence theorem.'])
