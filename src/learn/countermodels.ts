import { chapter, edge, hints, lesson, w } from './shared'

const lessons = [
  lesson('models-countermodels', 'countermodels-locate', 'Locate the failure', 'Identify where a pointed implication fails.',
    { heading: 'A countermodel includes a failing world', intuitive: 'An implication fails where its antecedent is true and consequent false.', formula: '□p → p', keyPoints: ['Evaluate both sides at w0.', 'The successor valuation makes □p true.'] },
    { interactionMode: 'question', instruction: 'Select the world where □p → p is false.', formula: '□p → p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'At which world is □p → p false?', expectedChoice: 'w0', worldChoices: ['w0', 'w1'], mustBeCorrect: true }, worlds: [w('w0'), w('w1', 'p', 390)], edges: [edge('w0', 'w1')], editable: [] },
    hints('At w0, check the successor before the consequent.', '□p is true and p at w0 is false.', 'Choose w0.'), 'At w0, □p is true because w1 satisfies p, while p is false at w0. The implication therefore fails at w0.'),

  lesson('models-countermodels', 'countermodels-valuation', 'Complete the valuation', 'Create a countermodel through one valuation change.',
    { heading: 'Separate diamond from box on two branches', intuitive: 'Give one successor p and leave the other without p.', formula: '◇p → □p', keyPoints: ['The antecedent needs one witness.', 'The consequent needs every successor.'] },
    { instruction: 'Make ◇p → □p false at w0 by changing exactly one successor valuation.', formula: '◇p → □p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 60), w('w1', '', 360, 60), w('w2', '', 360, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], constraints: { maximumChanges: 1 }, editable: ['valuations'] },
    hints('Make ◇p true without making □p true.', 'Only one successor should receive p.', 'Add p to exactly one of w1 or w2.'), 'One p-successor makes ◇p true, while the other successor without p makes □p false.'),

  lesson('models-countermodels', 'countermodels-relation', 'Complete the relation', 'Create a countermodel through one accessibility edge.',
    { heading: 'Add a counterexample branch', intuitive: 'The existing p-successor witnesses ◇p. add a non-p successor to defeat □p.', formula: '◇p → □p', keyPoints: ['Keep w0 → w1.', 'Make w2 accessible too.'] },
    { instruction: 'Make ◇p → □p false at w0 by adding one edge.', formula: '◇p → □p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 60), w('w1', 'p', 360, 60), w('w2', '', 360, 210)], edges: [edge('w0', 'w1')], constraints: { minimumEdges: 2, maximumEdges: 2, requiredEdges: [edge('w0', 'w1'), edge('w0', 'w2')] }, editable: ['edges'] },
    hints('◇p already has its witness.', '□p needs a reachable counterexample.', 'Add w0 → w2.'), 'w1 keeps ◇p true while the newly accessible w2 makes □p false.'),

  lesson('models-countermodels', 'countermodels-build', 'Build a pointed countermodel', 'Construct a two-world countermodel from scratch.',
    { heading: 'Build antecedent true and consequent false', intuitive: 'Make p false at w0 while every successor of w0 has p.', formula: '□p → p', keyPoints: ['Use exactly two worlds.', 'Use exactly one edge.'] },
    { instruction: 'Build a two-world, one-edge countermodel to □p → p at w0.', formula: '□p → p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', 'p', 220)], edges: [], constraints: { minimumWorlds: 2, maximumWorlds: 2, minimumEdges: 1, maximumEdges: 1 }, editable: ['worlds', 'valuations', 'edges'], workspacePresentation: { worlds: true, valuations: true, edges: true, visibleConstraints: ['Use exactly two worlds and one edge.'] } },
    hints('The implication must start true on the left and false on the right.', 'Make p false at w0 and create a p-successor.', 'Use w0: ∅, w1: p, and w0 → w1.'), 'At w0 the boxed antecedent is true, while p itself is false.'),

  lesson('models-countermodels', 'countermodels-global', 'Refute model-global truth', 'Identify a counterexample to truth throughout a model.',
    { heading: 'One world refutes M ⊨ φ', intuitive: 'Model-global truth fails as soon as any world falsifies the formula.', formula: '◇p', keyPoints: ['w0 and w1 have witnesses.', 'Check the isolated self-loop.'] },
    { interactionMode: 'question', instruction: 'Select the world that refutes M ⊨ ◇p.', formula: '◇p', scope: 'model', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'counterexample-world', prompt: 'Which world refutes M ⊨ ◇p?', expectedChoice: 'w2', mustBeCorrect: true }, worlds: [w('w0', '', 40), w('w1', 'p', 270), w('w2', '', 500)], edges: [edge('w0', 'w1'), edge('w1', 'w1'), edge('w2', 'w2')], editable: [] },
    hints('Evaluate ◇p at every world.', 'w2 only accesses itself.', 'Choose w2, where p is false.'), 'w2 accesses only itself and p is false there, so ◇p fails at w2 and therefore is not true throughout the model.'),

  lesson('models-countermodels', 'countermodels-countervaluation', 'Find a countervaluation', 'Choose a valuation that refutes frame validity.',
    { heading: 'Frame countermodels vary atom assignments', intuitive: 'Keep the frame fixed and choose a valuation where the formula fails.', formula: '□p → p', keyPoints: ['Make □p true at w0.', 'Make p false at w0.'] },
    { interactionMode: 'question', instruction: 'Choose the valuation that refutes □p → p on this frame.', formula: '□p → p', scope: 'frame', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'countervaluation', prompt: 'Which valuation refutes □p → p on this frame?', expectedChoice: 'p-false-at-w0-true-at-w1', mustBeCorrect: true, countervaluationChoices: [
      { id: 'p-true-everywhere', valuation: { w0: ['p'], w1: ['p'] } },
      { id: 'p-false-at-w0-true-at-w1', valuation: { w0: [], w1: ['p'] } },
      { id: 'p-false-everywhere', valuation: { w0: [], w1: [] } },
    ] }, worlds: [w('w0'), w('w1', '', 390)], edges: [edge('w0', 'w1'), edge('w1', 'w1')], editable: [] },
    hints('An implication fails with true antecedent and false consequent.', 'p must be false at w0 but true at its successor.', 'Choose p-false-at-w0-true-at-w1.'), 'With p false at w0 and true at w1, □p is true at w0 while p is false there. This valuation refutes frame validity.'),

  lesson('models-countermodels', 'countermodels-smaller', 'Remove irrelevant structure', 'Simplify a countermodel without claiming absolute minimality.',
    { heading: 'Disconnected structure can be irrelevant', intuitive: 'Remove a component that contributes nothing to the failure at w0.', formula: '◇p → □p', keyPoints: ['The failure uses w0, w1, and w2.', 'w3 is disconnected from them.'], warning: 'A smaller finite example is not automatically a proof of absolute minimality.' },
    { instruction: 'Remove irrelevant structure while keeping the formula false at w0.', formula: '◇p → □p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 40), w('w1', 'p', 270, 60), w('w2', '', 270, 210), w('w3', 'q', 500)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w3', 'w3')], constraints: { minimumWorlds: 3, maximumWorlds: 3, minimumEdges: 2, maximumEdges: 2 }, editable: ['worlds'] },
    hints('The failure at w0 uses its two successors.', 'Find the disconnected q-world.', 'Delete w3. its self-loop disappears too.'), 'The disconnected q-world was irrelevant to the failure at w0. The smaller remaining model is still a countermodel.'),
]

export const countermodelsChapter = chapter('models-countermodels', 'Models and Countermodels', 'Locate, complete, construct, and simplify countermodels.', ['semantic-scopes'], lessons, ['A countermodel refutes a claim at a specified semantic scope.', 'Failure can come from the evaluation world, a valuation, an accessibility edge, or the selected scope.', 'A smaller countermodel is useful, but a finite search does not by itself prove absolute minimality.'], 'Continue to Frame Properties to study the relation independently of valuation.')
