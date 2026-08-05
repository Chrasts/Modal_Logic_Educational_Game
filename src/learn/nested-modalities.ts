import { chapter, edge, hints, lesson, w } from './shared'

const lessons = [
  lesson('nested-modalities', 'nested-double-diamond', 'Two-step possibility', 'Follow two existential modal steps.',
    { heading: 'Each diamond moves evaluation one step', intuitive: '◇◇p needs a path of length two ending at a p-world.', formal: 'Choose w1 from w0, then a p-world from w1.', formula: '◇◇p', keyPoints: ['The final p is checked two edges away.', 'The middle world need not have p.'] },
    { instruction: 'Make ◇◇p true at w0 with one valuation change.', formula: '◇◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 60), w('w1', '', 260), w('w2', '', 460)], edges: [edge('w0', 'w1'), edge('w1', 'w2')], constraints: { maximumChanges: 1 }, editable: ['valuations'], workspacePresentation: { valuations: true } },
    hints('Follow two arrows from w0.', 'The inner diamond is evaluated at w1.', 'Add p to w2.'), 'w1 witnesses the outer diamond, and w2 witnesses the inner diamond evaluated at w1.'),

  lesson('nested-modalities', 'nested-box-diamond', 'Every branch needs a witness', 'Make every first-step successor have a p-witness.',
    { heading: 'Box then diamond combines all with some', intuitive: 'Every successor of w0 must itself access at least one p-world.', formula: '□◇p', keyPoints: ['Check w1 and w2.', 'Each needs its own diamond witness.'] },
    { instruction: 'Make □◇p true by adding one edge.', formula: '□◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 60), w('w1', '', 280, 65), w('w2', '', 280, 205), w('w3', 'p', 500)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3')], constraints: { minimumEdges: 4, maximumEdges: 4, requiredEdges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3'), edge('w2', 'w3')] }, editable: ['edges'] },
    hints('w1 already has an accessible p-witness.', 'w2 still needs one.', 'Add w2 → w3.'), 'Both successors of w0 now have an accessible p-witness.'),

  lesson('nested-modalities', 'nested-diamond-box', 'Find the boxed witness', 'Identify a successor where □p holds.',
    { heading: 'Diamond chooses a world where box succeeds', intuitive: 'One successor of w0 must have only p-successors.', formula: '◇□p', keyPoints: ['Evaluate □p separately at w1 and w2.', 'One counterexample defeats the inner box.'] },
    { instruction: 'Select the successor of w0 at which □p is true.', formula: '◇□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'Which successor of w0 witnesses ◇□p?', expectedChoice: 'w2', worldChoices: ['w1', 'w2'], mustBeCorrect: true }, worlds: [w('w0', '', 30), w('w1', '', 230, 60), w('w2', '', 230, 210), w('w3', 'p', 470, 20), w('w4', '', 470, 110), w('w5', 'p', 470, 220)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3'), edge('w1', 'w4'), edge('w2', 'w5')], editable: [] },
    hints('Check □p at each successor of w0.', 'w1 has an accessible counterexample w4.', 'Choose w2; its only successor w5 has p.'), 'w2 witnesses ◇□p because its only successor, w5, satisfies p. w1 fails because w4 is a counterexample.'),

  lesson('nested-modalities', 'nested-double-box', 'Counterexample two levels down', 'Repair a nested universal claim.',
    { heading: 'A distant counterexample propagates outward', intuitive: 'If one second-level world lacks p, the inner box and then the outer box fail.', formula: '□□p', keyPoints: ['Trace both length-two branches.', 'Only w4 lacks p.'] },
    { instruction: 'Make □□p true at w0 with one valuation change.', formula: '□□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 30), w('w1', '', 230, 60), w('w2', '', 230, 210), w('w3', 'p', 470, 60), w('w4', '', 470, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3'), edge('w2', 'w4')], constraints: { maximumChanges: 1 }, editable: ['valuations'] },
    hints('Evaluate □p at both w1 and w2.', 'w4 is the only second-level counterexample.', 'Add p to w4.'), 'w4 was a counterexample to □p at w2, which made □□p false at w0.'),

  lesson('nested-modalities', 'nested-order', 'Modal order matters', 'Distinguish □◇p from ◇□p.',
    { heading: 'Universal–existential order is not interchangeable', intuitive: 'Every branch having some p-witness differs from one branch whose every successor has p.', formula: '□◇p / ◇□p', keyPoints: ['Formula A starts with □.', 'Formula B starts with ◇.'] },
    { instruction: 'Add exactly two edges so □◇p is true and ◇□p is false at w0.', formula: '□◇p', comparisonFormula: '◇□p', comparisonTarget: { formulaATruth: true, formulaBTruth: false }, scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 50), w('w1', '', 250), w('w2', 'p', 480, 60), w('w3', '', 480, 210)], edges: [edge('w0', 'w1')], constraints: { minimumEdges: 3, maximumEdges: 3, requiredEdges: [edge('w0', 'w1'), edge('w1', 'w2'), edge('w1', 'w3')] }, editable: ['edges'] },
    hints('The only successor of w0 is w1.', 'Give w1 one p-successor and one non-p successor.', 'Add w1 → w2 and w1 → w3.'), 'w1 has a p-witness, so □◇p is true; its non-p successor makes □p false there, so ◇□p is false.'),
]

export const nestedModalitiesChapter = chapter('nested-modalities', 'Nested Modalities', 'Follow modal evaluation across paths of two or more steps.', ['box-diamond'], lessons, ['Each modal operator changes the world at which its operand is evaluated.', '◇◇p follows an existential path of length two.', '□◇p, ◇□p, and □□p combine different quantifier patterns and are not interchangeable.'], 'Continue to Local, Global, and Frame Truth to compare three semantic scopes.')
