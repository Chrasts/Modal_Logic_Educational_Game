import { chapter, edge, hints, lesson, w } from './shared'

const lessons = [
  lesson('semantic-scopes', 'scopes-pointed', 'Pointed truth', 'Select a world at which the formula is true.',
    { heading: 'Pointed truth concerns one selected world', intuitive: 'M,w ⊨ φ asks only about φ at w under the displayed valuation.', formal: 'M,w ⊨ φ', formula: '◇p', keyPoints: ['The evaluation world is part of the claim.', 'Other worlds matter only through accessibility.'] },
    { interactionMode: 'question', instruction: 'Select a world where ◇p is true.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'At which world is ◇p true?', expectedChoice: 'w0', worldChoices: ['w0', 'w1', 'w2', 'w3'], mustBeCorrect: true }, worlds: [w('w0', '', 40), w('w1', '', 40, 220), w('w2', 'p', 360, 60), w('w3', '', 360, 220)], edges: [edge('w0', 'w2'), edge('w1', 'w3')], editable: [] },
    hints('Compare the successors of w0 and w1.', 'Only w0 reaches a p-world.', 'Select w0 on the map.'), 'At w0, the accessible world w2 witnesses ◇p.'),

  lesson('semantic-scopes', 'scopes-model', 'Truth throughout a model', 'Make a formula true at every world under one valuation.',
    { heading: 'Model-global truth checks every world', intuitive: 'M ⊨ φ holds only if φ is true at each world of the displayed model.', formal: 'M ⊨ φ iff every w ∈ W satisfies M,w ⊨ φ.', formula: '◇p', keyPoints: ['The displayed valuation stays fixed.', 'One failing world refutes the claim.'] },
    { instruction: 'Make ◇p true at every world of the model by adding one edge.', formula: '◇p', scope: 'model', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 100), w('w1', 'p', 390)], edges: [edge('w0', 'w1')], constraints: { minimumEdges: 2, maximumEdges: 2, requiredEdges: [edge('w0', 'w1'), edge('w1', 'w1')] }, editable: ['edges'] },
    hints('◇p already holds at w0.', 'It fails at w1 because w1 has no successor.', 'Add the self-loop w1 → w1.'), 'w0 reaches p at w1, and w1 reaches its own p through the new self-loop.'),

  lesson('semantic-scopes', 'scopes-local-not-global', 'Local does not imply global', 'Locate the world that refutes model-global truth.',
    { heading: 'A local success can coexist with global failure', intuitive: 'The formula may hold at w0 but fail at another world.', formula: '◇p', keyPoints: ['Check all three worlds.', 'A dead end has no diamond witness.'] },
    { interactionMode: 'question', instruction: 'Select the world that prevents ◇p from being true throughout the model.', formula: '◇p', scope: 'model', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'counterexample-world', prompt: 'Which world prevents ◇p from being true throughout the model?', expectedChoice: 'w2', mustBeCorrect: true }, worlds: [w('w0', '', 40), w('w1', 'p', 270), w('w2', 'p', 500)], edges: [edge('w0', 'w1'), edge('w1', 'w2')], editable: [] },
    hints('◇p is true at w0.', 'It is also true at w1.', 'Choose w2, which has no successor.'), '◇p is true at w0 and w1, but false at w2 because w2 has no successor. Therefore it is not model-globally true.'),

  lesson('semantic-scopes', 'scopes-frame', 'Valid on a frame', 'Repair a frame so an implication holds under every valuation.',
    { heading: 'Frame validity varies the valuation too', intuitive: 'F ⊨ φ checks every world under every possible valuation on the fixed relation.', formal: 'F ⊨ φ iff ∀ν∀w, ⟨F,ν⟩,w ⊨ φ.', formula: '□p → ◇p', keyPoints: ['The displayed atoms are only one example.', 'Seriality removes dead ends.'] },
    { instruction: 'Make □p → ◇p valid on the frame by adding one edge.', formula: '□p → ◇p', scope: 'frame', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 100), w('w1', '', 390)], edges: [edge('w0', 'w1')], constraints: { minimumEdges: 2, maximumEdges: 2, requiredEdges: [edge('w0', 'w1'), edge('w1', 'w1')] }, editable: ['edges'] },
    hints('The implication can fail at a dead end.', 'w1 is the only dead end.', 'Add w1 → w1.'), 'Every world now has a successor, so whenever □p is true there is at least one successor witnessing ◇p.'),

  lesson('semantic-scopes', 'scopes-comparison', 'Three scopes, one model', 'Compare pointed, model-global, and frame-valid truth for one formula.',
    { heading: 'One model supports three different semantic claims', intuitive: 'Changing the quantification changes the truth profile without changing the diagram.', formula: '◇p', keyPoints: ['Pointed checks w0.', 'Model-global also checks w1.', 'Frame validity additionally checks every valuation.'] },
    { interactionMode: 'question', instruction: 'Choose the correct truth profile for ◇p in the displayed structure.', formula: '◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', scopeComparison: { evaluationWorld: 'w0' }, prediction: { kind: 'statement-choice', prompt: 'Which truth profile does ◇p have in the displayed structure?', expectedChoice: 'pointed-true-model-false-frame-false', mustBeCorrect: true, statementChoices: [
      { id: 'all-true', label: 'Pointed: true · Model-global: true · Frame-valid: true' },
      { id: 'pointed-true-model-false-frame-false', label: 'Pointed: true · Model-global: false · Frame-valid: false' },
      { id: 'pointed-false-model-false-frame-true', label: 'Pointed: false · Model-global: false · Frame-valid: true' },
      { id: 'pointed-true-model-true-frame-false', label: 'Pointed: true · Model-global: true · Frame-valid: false' },
    ] }, worlds: [w('w0', '', 100), w('w1', 'p', 390)], edges: [edge('w0', 'w1')], editable: [] },
    hints('At w0, w1 witnesses ◇p.', 'For model-global truth, also evaluate at the dead end w1.', 'Frame validity fails under a valuation with no accessible p-witness.'), 'w1 witnesses ◇p at w0. The formula is not true throughout the model because w1 has no successor. It is not valid on the frame because some valuation assigns p to no accessible successor.'),
]

export const semanticScopesChapter = chapter('semantic-scopes', 'Local, Global, and Frame Truth', 'Distinguish pointed truth, model-global truth, and validity on a frame.', ['nested-modalities'], lessons, ['M,w ⊨ φ concerns one selected world.', 'M ⊨ φ requires φ at every world under the displayed valuation.', 'F ⊨ φ requires φ at every world under every valuation on the frame.'], 'Continue to Models and Countermodels to refute claims at the correct semantic scope.')
