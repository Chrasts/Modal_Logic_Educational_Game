import type { GameLevel } from './campaign'
import type { ConceptQuestion, LearnChapter, LearnLesson } from './learn'

const w = (id: string, atoms: string, x: number, y: number) => ({ id, atoms, position: { x, y } })
const edge = (from: string, to: string) => ({ from, to })
const hints = (first: string, second: string, third: string): readonly [string, string, string] => [first, second, third]

function lesson(
  chapterId: string,
  id: string,
  title: string,
  learningObjective: string,
  concept: LearnLesson['concept'],
  task: Omit<GameLevel, 'id' | 'chapter' | 'title' | 'concept' | 'learningObjective'> & { readonly chapter?: string },
  lessonHints: readonly [string, string, string],
  successExplanation: string,
  extras: Partial<Pick<LearnLesson, 'workedExample' | 'commonMistake' | 'diagnosticFeedback' | 'transferTask'>> = {},
): LearnLesson {
  return {
    id: `learn-${id}`,
    chapterId,
    title,
    learningObjective,
    concept,
    task: { ...task, id: `learn-${id}-task`, chapter: task.chapter ?? title, title, concept: concept.heading, learningObjective },
    hints: lessonHints,
    successExplanation,
    ...extras,
  }
}

const necessityLessons: readonly LearnLesson[] = [
  lesson('necessity', 'necessity-one-successor', 'One accessible successor', 'Make □p true by checking the only accessible successor.', {
    heading: 'Box checks every accessible successor', intuitive: 'With one outgoing edge, □p asks whether its one target satisfies p.', formal: 'M,w ⊨ □p iff every v with wRv satisfies p.', formula: '□p', keyPoints: ['Start at w0.', 'Only w1 is accessible.', 'p need not hold at unrelated worlds.'], warning: '□p at w0 does not mean p is true everywhere in the model.',
  }, {
    instruction: 'Make □p true at w0 by editing the valuation of its one successor.', formula: '□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is □p currently true at w0?' },
    worlds: [w('w0', '', 70, 130), w('w1', '', 330, 130), w('w2', '', 520, 230)], edges: [edge('w0', 'w1')], constraints: { requiredAtoms: { w1: ['p'] }, minimumEdges: 1, maximumEdges: 1 }, editable: ['valuations'], workspacePresentation: { valuations: true },
  }, hints('Follow the edge leaving w0.', 'The only checked successor is w1.', 'Add p to w1. w2 is unrelated.'), '□p is true at w0 because its only accessible successor w1 satisfies p.'),

  lesson('necessity', 'necessity-branching', 'Every branch is checked', 'Understand universal checking across several successors.', {
    heading: 'One bad branch is enough to break box', intuitive: 'When accessibility branches, every outgoing target must satisfy the boxed operand.', formal: '∀v (wRv → M,v ⊨ p).', formula: '□p', keyPoints: ['w1 already satisfies p.', 'w2 is also checked.', 'One counterexample makes □p false.'],
  }, {
    instruction: 'Make □p true at w0 without changing the two outgoing edges.', formula: '□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is □p currently true at w0?' },
    worlds: [w('w0', '', 70, 130), w('w1', 'p', 380, 60), w('w2', '', 380, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], constraints: { requiredAtoms: { w1: ['p'], w2: ['p'] }, requiredEdges: [edge('w0', 'w1'), edge('w0', 'w2')], maximumEdges: 2 }, editable: ['valuations'], workspacePresentation: { valuations: true },
  }, hints('Inspect both successors of w0.', 'w1 passes the p-check.', 'Add p to w2.'), 'Both accessible successors satisfy p, so the universal box condition holds.'),

  lesson('necessity', 'necessity-counterexample', 'Find the box counterexample', 'Identify the successor that falsifies a boxed formula.', {
    heading: 'A false box has a counterexample successor', intuitive: 'To refute □p, point to one accessible world where p fails.', formal: 'M,w ⊭ □p iff some v has wRv and M,v ⊭ p.', formula: '□p', keyPoints: ['The counterexample must be accessible.', 'One failing successor is sufficient.'],
  }, {
    instruction: 'Select the accessible counterexample to □p at w0.', formula: '□p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'Which successor is the counterexample to □p?', expectedChoice: 'w2', worldChoices: ['w1', 'w2', 'w3'], mustBeCorrect: true },
    worlds: [w('w0', '', 50, 130), w('w1', 'p', 300, 40), w('w2', '', 300, 130), w('w3', '', 300, 220)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], editable: [], workspacePresentation: { evaluation: true },
  }, hints('Only successors of w0 count.', 'w3 is not accessible.', 'w2 is accessible and lacks p.'), 'w2 is the explicit counterexample successor: w0Rw2 and p is false at w2.'),

  lesson('necessity', 'necessity-vacuous', 'Vacuous necessity', 'Explain why □p is true at a world with no successors.', {
    heading: 'No successor means no counterexample', intuitive: 'A universal claim over an empty successor set is true because there is no failing case.', formal: 'If there is no v with wRv, then M,w ⊨ □φ.', formula: '□p', keyPoints: ['w0 has 0 successors.', 'No p-witness is required for box.', 'At the same world ◇p is false.'], warning: 'Vacuous truth does not assert p at w0.',
  }, {
    instruction: 'Predict and verify □p at the dead-end world w0.', formula: '□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'With 0 successors, is □p true at w0?', mustBeCorrect: true }, worlds: [w('w0', '', 220, 130), w('w1', '', 480, 130)], edges: [], editable: [], workspacePresentation: { evaluation: true },
  }, hints('Count arrows leaving w0.', 'There are no successors to check.', 'A universal statement over zero cases has no counterexample.'), '□p is vacuously true at w0 because it has 0 successors, even though p is not assigned there.'),

  lesson('necessity', 'necessity-repair', 'Repair a necessity claim', 'Choose a one-edit repair involving valuation, relation, or evaluation world.', {
    heading: 'Several semantic repairs may be possible', intuitive: 'A box failure can be repaired by fixing its counterexample, changing which worlds are accessible, or evaluating at a different world.', formula: '□p', keyPoints: ['Find why □p fails first.', 'Use exactly one semantic edit.', 'Explain which part of M,w ⊨ □p changed.'],
  }, {
    instruction: 'Make □p true using exactly one semantic edit.', formula: '□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is □p true before your repair?' },
    worlds: [w('w0', '', 60, 130), w('w1', '', 310, 80), w('w2', 'p', 500, 190)], edges: [edge('w0', 'w1')], constraints: { maximumChanges: 1 }, editable: ['valuations', 'edges', 'evaluation'], workspacePresentation: { valuations: true, edges: true, evaluation: true },
  }, hints('w1 is the current counterexample.', 'Adding p to w1 repairs the valuation.', 'Removing w0→w1 or evaluating at dead-end w2 also changes the semantic reason.'), 'The repaired model has no accessible counterexample at the chosen evaluation world.', { commonMistake: 'Changing an unrelated world does not affect □p at w0.' }),
]

const boxDiamondLessons: readonly LearnLesson[] = [
  lesson('nested-modalities', 'box-diamond-split', 'Possible but not necessary', 'Construct a model where ◇p is true and □p is false.', {
    heading: 'Diamond and box quantify differently', intuitive: 'Diamond needs one p-successor. box rejects any non-p successor.', formula: '◇p / □p', keyPoints: ['Keep one p-witness.', 'Keep one box counterexample.', 'The same successor set supports both results.'],
  }, {
    instruction: 'Make Formula A ◇p true and Formula B □p false at w0.', formula: '◇p', comparisonFormula: '□p', comparisonTarget: { formulaATruth: true, formulaBTruth: false }, scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 60, 130), w('w1', 'p', 360, 70), w('w2', 'p', 360, 200)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], constraints: { requiredAtoms: { w1: ['p'] }, forbiddenAtoms: { w2: ['p'] } }, editable: ['valuations'], workspacePresentation: { valuations: true },
  }, hints('◇p should keep a witness.', '□p needs one failing successor.', 'Remove p from w2 only.'), 'w1 witnesses ◇p while w2 is a counterexample to □p.'),

  lesson('nested-modalities', 'box-diamond-both', 'Both box and diamond', 'Construct a nonempty successor set where both □p and ◇p hold.', {
    heading: 'Both can be true', intuitive: 'If every successor has p and at least one successor exists, both modal claims hold.', formula: '□p ∧ ◇p', keyPoints: ['Box checks all successors.', 'Diamond also needs the set to be nonempty.'],
  }, {
    instruction: 'Make both □p and ◇p true at w0.', formula: '□p', comparisonFormula: '◇p', comparisonTarget: { formulaATruth: true, formulaBTruth: true }, scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 60, 130), w('w1', 'p', 360, 70), w('w2', '', 360, 200)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], constraints: { requiredAtoms: { w1: ['p'], w2: ['p'] } }, editable: ['valuations'], workspacePresentation: { valuations: true },
  }, hints('The edges already provide successors.', 'w1 already passes.', 'Add p to w2.'), 'Every successor has p and the successor set is nonempty, so both formulas hold.'),

  lesson('nested-modalities', 'box-diamond-neither', 'Neither box nor diamond', 'Construct a nonempty successor set where neither □p nor ◇p holds.', {
    heading: 'Both can be false', intuitive: 'If successors exist but none has p, diamond has no witness and box has counterexamples.', formula: '¬□p ∧ ¬◇p', keyPoints: ['Keep the edges.', 'Remove the last p-witness.'],
  }, {
    instruction: 'Make both □p and ◇p false at w0.', formula: '□p', comparisonFormula: '◇p', comparisonTarget: { formulaATruth: false, formulaBTruth: false }, scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 60, 130), w('w1', 'p', 360, 70), w('w2', '', 360, 200)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], constraints: { forbiddenAtoms: { w1: ['p'], w2: ['p'] } }, editable: ['valuations'], workspacePresentation: { valuations: true },
  }, hints('◇p still has one witness.', '□p is already false.', 'Remove p from w1.'), 'No successor satisfies p, so diamond lacks a witness and every successor is a box counterexample.'),

  lesson('nested-modalities', 'box-diamond-vacuous', 'The empty-successor contrast', 'Verify that vacuous □p can coexist with false ◇p.', {
    heading: 'Empty accessibility separates box and diamond', intuitive: 'With no successors, box has no counterexample while diamond has no witness.', formula: '□p / ◇p', keyPoints: ['Remove the only edge.', 'The valuation of the former successor becomes irrelevant.'],
  }, {
    instruction: 'Make □p true and ◇p false by creating a dead end at w0.', formula: '□p', comparisonFormula: '◇p', comparisonTarget: { formulaATruth: true, formulaBTruth: false }, scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 80, 130), w('w1', 'p', 390, 130)], edges: [edge('w0', 'w1')], constraints: { maximumEdges: 0 }, editable: ['edges'], workspacePresentation: { edges: true },
  }, hints('The current edge gives diamond a witness.', 'A dead end has no witness.', 'Remove w0→w1.'), 'At a dead end □p is vacuously true and ◇p is false.'),

  lesson('nested-modalities', 'diamond-duality', 'Verify the diamond duality', 'Check ◇p and ¬□¬p on one concrete model.', {
    heading: 'Diamond is the dual of box', intuitive: 'Having one accessible p-world is equivalent to it not being the case that every successor lacks p.', formal: '◇φ ≡ ¬□¬φ.', formula: '◇p ≡ ¬□¬p', keyPoints: ['Evaluate both formulas on the same model.', 'Compare their truth values, not their syntax.'],
  }, {
    instruction: 'Predict whether ◇p and ¬□¬p agree at w0, then verify.', formula: '◇p', comparisonFormula: '¬□¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Are ◇p and ¬□¬p equivalent at w0?', mustBeCorrect: true }, worlds: [w('w0', '', 80, 130), w('w1', '', 380, 70), w('w2', 'p', 380, 200)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], editable: [], workspacePresentation: { evaluation: true },
  }, hints('Evaluate ◇p first.', 'w2 is a p-witness.', 'Then ask whether □¬p can remain true.'), 'Both formulas are true: the p-witness refutes □¬p and therefore establishes ¬□¬p.'),

  lesson('nested-modalities', 'box-duality', 'Verify the box duality', 'Check □p and ¬◇¬p on one concrete model.', {
    heading: 'Box is the dual of diamond', intuitive: 'Every successor satisfying p is equivalent to there being no accessible counterexample satisfying ¬p.', formal: '□φ ≡ ¬◇¬φ.', formula: '□p ≡ ¬◇¬p', keyPoints: ['Look for a ¬p counterexample.', 'If none exists, both sides are true.'],
  }, {
    instruction: 'Predict whether □p and ¬◇¬p agree at w0, then verify.', formula: '□p', comparisonFormula: '¬◇¬p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Are □p and ¬◇¬p equivalent at w0?', mustBeCorrect: true }, worlds: [w('w0', '', 80, 130), w('w1', 'p', 380, 70), w('w2', 'p', 380, 200)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], editable: [], workspacePresentation: { evaluation: true },
  }, hints('Every successor has p.', 'No successor satisfies ¬p.', 'Therefore ◇¬p is false and its negation is true.'), 'Both formulas are true because all successors satisfy p and no accessible ¬p counterexample exists.'),
]

const nestedLessons: readonly LearnLesson[] = [
  lesson('nested-modalities', 'nested-diamond-diamond', 'Two possibility steps', 'Trace and construct a two-edge witness for ◇◇p.', {
    heading: 'Each diamond consumes one edge', intuitive: 'The outer diamond chooses a successor. the inner diamond continues from that new world.', formal: 'M,w ⊨ ◇◇p iff ∃v,u (wRv ∧ vRu ∧ M,u ⊨ p).', formula: '◇◇p', keyPoints: ['First evaluate at w0.', 'Then evaluate ◇p at w1.', 'p is finally checked at w2.'],
  }, {
    instruction: 'Complete the two-step witness path for ◇◇p at w0.', formula: '◇◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 40, 130), w('w1', '', 270, 130), w('w2', 'p', 500, 130)], edges: [edge('w0', 'w1')], constraints: { requiredEdges: [edge('w0', 'w1'), edge('w1', 'w2')], maximumEdges: 2 }, editable: ['edges'], workspacePresentation: { edges: true },
  }, hints('The outer diamond already reaches w1.', 'The inner diamond is evaluated at w1.', 'Add w1→w2.'), 'The path w0→w1→w2 supplies one witness for each diamond layer.'),

  lesson('nested-modalities', 'nested-box-diamond', 'Every branch needs a witness', 'Understand the universal–existential pattern in □◇p.', {
    heading: 'Box branches, then diamond finds witnesses', intuitive: 'Every immediate successor of w0 must itself have some p-successor.', formal: '∀v (w0Rv → ∃u (vRu ∧ M,u ⊨ p)).', formula: '□◇p', keyPoints: ['Both w1 and w2 are checked by box.', 'Each needs an inner diamond witness.'],
  }, {
    instruction: 'Make □◇p true by giving the missing branch a p-witness.', formula: '□◇p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 30, 130), w('w1', '', 240, 60), w('w2', '', 240, 210), w('w3', 'p', 500, 130)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3')], constraints: { requiredEdges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3'), edge('w2', 'w3')], maximumEdges: 4 }, editable: ['edges'], workspacePresentation: { edges: true },
  }, hints('w1 already has a route to p.', 'w2 is the failing box branch.', 'Add w2→w3.'), 'Each immediate successor now has an accessible p-world, so every □-branch satisfies ◇p.'),

  lesson('nested-modalities', 'nested-diamond-box', 'Choose a boxed witness', 'Identify the outer witness whose successors all satisfy p.', {
    heading: 'Diamond chooses one world where box succeeds', intuitive: 'The outer diamond needs one successor at which the entire boxed formula holds.', formal: '∃v (w0Rv ∧ ∀u(vRu → M,u ⊨ p)).', formula: '◇□p', keyPoints: ['w1 has a counterexample successor.', 'w2 has only p-successors.', 'Unrelated branches do not spoil the chosen witness.'],
  }, {
    instruction: 'Select the outer witness for ◇□p at w0.', formula: '◇□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'world-choice', prompt: 'Which immediate successor witnesses ◇□p?', expectedChoice: 'w2', worldChoices: ['w1', 'w2'], mustBeCorrect: true }, worlds: [w('w0', '', 30, 130), w('w1', '', 220, 60), w('w2', '', 220, 210), w('w3', 'p', 480, 60), w('w4', '', 480, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3'), edge('w1', 'w4'), edge('w2', 'w3')], editable: [], workspacePresentation: { evaluation: true },
  }, hints('Check □p separately at w1 and w2.', 'w1 reaches w4 where p fails.', 'w2 reaches only w3, where p holds.'), 'w2 witnesses the outer diamond because □p holds there. w1 is irrelevant once one suitable witness exists.'),

  lesson('nested-modalities', 'nested-box-box', 'Two universal layers', 'Repair the second-level counterexample to □□p.', {
    heading: 'Every two-step branch is checked', intuitive: 'The first box checks w1 and w2. the second box checks every successor leaving each of them.', formal: '∀v,u ((w0Rv ∧ vRu) → M,u ⊨ p).', formula: '□□p', keyPoints: ['Track the current evaluation world at each layer.', 'One bad second-step endpoint falsifies the whole formula.'],
  }, {
    instruction: 'Make □□p true by repairing the one second-level counterexample.', formula: '□□p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', worlds: [w('w0', '', 20, 130), w('w1', '', 210, 60), w('w2', '', 210, 210), w('w3', 'p', 460, 60), w('w4', '', 460, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2'), edge('w1', 'w3'), edge('w2', 'w4')], constraints: { requiredAtoms: { w3: ['p'], w4: ['p'] } }, editable: ['valuations'], workspacePresentation: { valuations: true },
  }, hints('Inspect endpoints two edges away from w0.', 'w3 passes.', 'Add p to w4.'), 'Every two-step endpoint now satisfies p, so both universal layers succeed.'),
]

const scopeWorlds = [w('w0', 'p', 100, 130), w('w1', '', 390, 130)]
const scopeLessons: readonly LearnLesson[] = [
  lesson('semantic-scopes', 'scope-pointed', 'Truth at one world', 'Evaluate M,w ⊨ p at a designated world.', {
    heading: 'Pointed truth fixes one world', intuitive: 'A pointed claim asks only about the selected evaluation world under the displayed valuation.', formal: 'M,w ⊨ φ.', formula: 'p', keyPoints: ['w0 is selected.', 'p at w1 does not decide the pointed claim.'],
  }, { instruction: 'Predict and verify p at the designated world w0.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is p true locally at w0?', mustBeCorrect: true }, worlds: scopeWorlds, edges: [], editable: [], workspacePresentation: { evaluation: true } }, hints('Read the highlighted evaluation world.', 'w0 contains p.', 'Answer True.'), 'M,w0 ⊨ p even though p fails elsewhere in the same model.'),

  lesson('semantic-scopes', 'scope-model', 'Truth throughout one model', 'Evaluate M ⊨ p under the current valuation.', {
    heading: 'Model-global truth checks every world', intuitive: 'The displayed valuation stays fixed, but every world must satisfy the formula.', formal: 'M ⊨ φ iff ∀w∈W, M,w ⊨ φ.', formula: 'p', keyPoints: ['Both w0 and w1 are checked.', 'One failing world refutes global truth.'],
  }, { instruction: 'Predict and verify whether p is globally true in this model.', formula: 'p', scope: 'model', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is p true at every world under the displayed valuation?', mustBeCorrect: true }, worlds: scopeWorlds, edges: [], editable: [], workspacePresentation: { evaluation: false } }, hints('Do not stop at w0.', 'Inspect w1 under the same valuation.', 'w1 is the global counterexample.'), 'M ⊭ p because p is false at w1 under the displayed valuation.'),

  lesson('semantic-scopes', 'scope-frame', 'Validity on a finite frame', 'Evaluate F ⊨ p across all worlds and all valuations.', {
    heading: 'Frame validity quantifies over valuations', intuitive: 'The displayed atoms are only one example. Frame validity searches every valuation on the same relation.', formal: 'F ⊨ φ iff ∀ν∀w, ⟨F,ν⟩,w ⊨ φ.', formula: 'p', keyPoints: ['Current atoms are not privileged.', 'A countervaluation can change every atom assignment.', 'The relation stays fixed.'],
  }, { instruction: 'Predict and verify whether p is valid on this finite frame.', formula: 'p', scope: 'frame', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'truth', prompt: 'Is p true at every world under every valuation?', mustBeCorrect: true }, worlds: scopeWorlds, edges: [], editable: [], workspacePresentation: { evaluation: false } }, hints('Frame validity changes the valuation.', 'Consider assigning p nowhere.', 'That countervaluation refutes validity.'), 'F ⊭ p because the frame admits a valuation in which p is false.'),

  lesson('semantic-scopes', 'scope-contrast', 'Compare all three scopes', 'Predict local, global, and frame truth before seeing the results side by side.', {
    heading: 'The same formula has three different claims', intuitive: 'Pointed, model-global, and frame truth differ in what they quantify over.', formal: 'M,w ⊨ φ. M ⊨ φ. F ⊨ φ.', formula: 'p', keyPoints: ['Local checks w0 only.', 'Global checks every world under the shown valuation.', 'Frame-valid checks all valuations too.'],
  }, { instruction: 'Predict all three truth levels, then compare the results.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', showScopeComparison: true, prediction: { kind: 'scope-truth', prompt: 'Predict local, model-global, and frame truth.', expectedChoice: 'true,false,false', mustBeCorrect: true }, worlds: scopeWorlds, edges: [], editable: [], workspacePresentation: { evaluation: true } }, hints('Local looks only at w0.', 'Global also checks w1.', 'Frame validity permits a valuation with no p.'), 'The contrast is local: yes. global: no. frame-valid: no.'),
]

const countermodelLessons: readonly LearnLesson[] = [
  lesson('models-countermodels', 'countermodel-critical-world', 'Mark the critical world', 'Identify the world that refutes model-global truth.', {
    heading: 'One world refutes a global claim', intuitive: 'A model-global countermodel includes a critical world where the formula fails.', formal: 'M ⊭ φ iff ∃w, M,w ⊭ φ.', formula: 'p', keyPoints: ['Keep the valuation fixed.', 'Select the failing world.'],
  }, { instruction: 'Select the counterexample world for the global claim p.', formula: 'p', scope: 'model', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'counterexample-world', prompt: 'Which world refutes model-global p?', expectedChoice: 'w1', mustBeCorrect: true }, worlds: scopeWorlds, edges: [], editable: [], workspacePresentation: { evaluation: true } }, hints('Global truth checks both worlds.', 'w0 has p.', 'w1 lacks p.'), 'w1 is the critical world that refutes M ⊨ p.'),

  lesson('models-countermodels', 'countermodel-valuation', 'Complete the countervaluation', 'Refute a pointed atomic claim by changing its valuation.', {
    heading: 'A countermodel needs the right valuation', intuitive: 'For an atomic claim, falsity is created by removing the atom at the critical world.', formula: 'p', keyPoints: ['The frame need not change.', 'Change p at w0.'],
  }, { instruction: 'Make p false at w0 by completing the countervaluation.', formula: 'p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', 'p', 220, 130)], edges: [], constraints: { forbiddenAtoms: { w0: ['p'] } }, editable: ['valuations'], workspacePresentation: { valuations: true } }, hints('The critical world is already w0.', 'p is currently present.', 'Remove p.'), 'The same one-world frame becomes a countermodel under a valuation where p is false.'),

  lesson('models-countermodels', 'countermodel-edge', 'Expose a box counterexample', 'Refute □p by adding accessibility to an existing non-p world.', {
    heading: 'Relations determine which counterexamples matter', intuitive: 'A non-p world refutes □p only after it becomes accessible from the critical world.', formula: '□p', keyPoints: ['w2 already lacks p.', 'Make it a successor of w0.'],
  }, { instruction: 'Add one edge so □p becomes false at w0.', formula: '□p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 50, 130), w('w1', 'p', 330, 70), w('w2', '', 330, 200)], edges: [edge('w0', 'w1')], constraints: { requiredEdges: [edge('w0', 'w1'), edge('w0', 'w2')], maximumEdges: 2 }, editable: ['edges'], workspacePresentation: { edges: true } }, hints('w1 satisfies p.', 'w2 is the unused non-p world.', 'Add w0→w2.'), 'The new edge makes w2 an accessible counterexample to □p.'),

  lesson('models-countermodels', 'countermodel-build', 'Build from a minimal seed', 'Construct a countermodel to □p → ◇p.', {
    heading: 'Falsify an implication deliberately', intuitive: 'Make the antecedent true and the consequent false. A dead end makes □p vacuously true and ◇p false.', formula: '□p → ◇p', keyPoints: ['An implication fails only true→false.', 'Remove the only witness edge.'],
  }, { instruction: 'Construct a countermodel to □p → ◇p from the seed model.', formula: '□p → ◇p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 80, 130), w('w1', 'p', 390, 130)], edges: [edge('w0', 'w1')], constraints: { maximumEdges: 0 }, editable: ['worlds', 'valuations', 'edges', 'evaluation'], workspacePresentation: { worlds: true, valuations: true, edges: true, evaluation: true } }, hints('The implication must have a true antecedent and false consequent.', 'A dead end makes □p true vacuously.', 'Remove w0→w1 so ◇p loses its witness.'), 'At dead-end w0, □p is true and ◇p is false, so the implication is false.'),

  lesson('models-countermodels', 'countermodel-shrink', 'Shrink without claiming minimality', 'Remove an irrelevant world while preserving a countermodel.', {
    heading: 'Smaller is not automatically absolutely minimal', intuitive: 'You can simplify a known countermodel by deleting irrelevant structure, but finite exploration is not a proof of global minimality.', formula: '□p → p', keyPoints: ['w0 already refutes the formula.', 'Delete one unrelated world.', 'Preserve the semantic failure.'],
  }, { instruction: 'Reduce this countermodel to at most two worlds while keeping □p → p false at w0.', formula: '□p → p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', worlds: [w('w0', '', 50, 130), w('w1', 'p', 310, 70), w('w2', 'q', 310, 200)], edges: [], constraints: { maximumWorlds: 2 }, editable: ['worlds'], workspacePresentation: { worlds: true } }, hints('w0 is a dead end without p.', 'That alone falsifies □p→p.', 'Delete either unrelated world.'), 'The smaller construction still refutes the formula. this demonstrates simplification, not absolute minimality.'),

  lesson('models-countermodels', 'countermodel-compare', 'Compare non-isomorphic countermodels', 'Recognize that different structures can refute the same claim.', {
    heading: 'Countermodels need not be isomorphic', intuitive: 'A dead-end countermodel and a branching countermodel can refute the same formula for different structural reasons.', formula: '□p → p', keyPoints: ['Compare relations as well as valuations.', 'Renaming worlds does not change isomorphism.', 'Different edge structure can.'],
  }, { instruction: 'Choose the branching countermodel. it is not isomorphic to the dead-end model.', formula: '□p → p', scope: 'pointed', targetTruth: false, evaluationWorld: 'w0', prediction: { kind: 'model-choice', prompt: 'Which candidate is the branching countermodel?', expectedChoice: 'B', mustBeCorrect: true, modelChoices: [
    { id: 'A', evaluationWorld: 'w0', worlds: [w('w0', '', 0, 0)], edges: [] },
    { id: 'B', evaluationWorld: 'w0', worlds: [w('w0', '', 0, 0), w('w1', 'p', 0, 0), w('w2', 'p', 0, 0)], edges: [edge('w0', 'w1'), edge('w0', 'w2')] },
  ] }, worlds: [w('w0', '', 220, 130)], edges: [], editable: [], workspacePresentation: { evaluation: true } }, hints('Count worlds and outgoing edges.', 'Model A is a dead end.', 'Model B branches to two successors.'), 'Both constructions refute □p→p at a non-p evaluation world, but their frames are not isomorphic.'),

  lesson('models-countermodels', 'countermodel-scope', 'Countermodels depend on scope', 'Distinguish a pointed success from global and frame counterexamples.', {
    heading: 'Always name the claim being refuted', intuitive: 'A world can satisfy a local claim even when the model-global and frame-valid claims fail.', formula: 'p', keyPoints: ['Pointed countermodel: one designated failure.', 'Global countermodel: one failing world under a fixed valuation.', 'Frame countermodel: also supplies a valuation.'],
  }, { instruction: 'Predict all three scopes for p on this model.', formula: 'p', scope: 'pointed', targetTruth: true, evaluationWorld: 'w0', showScopeComparison: true, prediction: { kind: 'scope-truth', prompt: 'Predict local, global, and frame truth.', expectedChoice: 'true,false,false', mustBeCorrect: true }, worlds: [w('w0', 'p', 40, 130), w('w1', '', 270, 70), w('w2', 'q', 480, 190)], edges: [edge('w0', 'w2')], editable: [], workspacePresentation: { evaluation: true } }, hints('p holds at w0.', 'p fails at w1.', 'A frame countervaluation may assign p nowhere.'), 'The same structure supports a local success, a model-global counterexample, and a frame countervaluation.'),
]

const propertySpecs = [
  { id: 'reflexive', title: 'Reflexivity and axiom T', formula: '□p → p', preset: 't' as const, worlds: [w('w0', '', 80, 130), w('w1', 'p', 390, 130)], edges: [edge('w0', 'w1')], mode: 'enforce' as const, hint: 'Enable reflexive enforcement so every world receives a loop.', formal: '∀w: wRw.' },
  { id: 'serial', title: 'Seriality and axiom D', formula: '□p → ◇p', preset: 'd' as const, worlds: [w('w0', '', 80, 130), w('w1', 'p', 390, 130)], edges: [edge('w0', 'w1')], mode: 'validate' as const, hint: 'w1 has no successor. add a loop at w1.', formal: '∀w∃v: wRv.' },
  { id: 'symmetric', title: 'Symmetry and axiom B', formula: 'p → □◇p', preset: 'b' as const, worlds: [w('w0', 'p', 80, 130), w('w1', '', 390, 130)], edges: [edge('w0', 'w1')], mode: 'enforce' as const, hint: 'Enable symmetric enforcement to derive w1→w0.', formal: '∀w,v: wRv → vRw.' },
  { id: 'transitive', title: 'Transitivity and axiom 4', formula: '□p → □□p', preset: '4' as const, worlds: [w('w0', '', 40, 130), w('w1', '', 270, 130), w('w2', 'p', 500, 130)], edges: [edge('w0', 'w1'), edge('w1', 'w2')], mode: 'enforce' as const, hint: 'Enable transitive enforcement to derive w0→w2.', formal: '∀w,v,u: (wRv ∧ vRu) → wRu.' },
  { id: 'euclidean', title: 'Euclideanness and axiom 5', formula: '◇p → □◇p', preset: '5' as const, worlds: [w('w0', '', 60, 130), w('w1', 'p', 360, 60), w('w2', '', 360, 210)], edges: [edge('w0', 'w1'), edge('w0', 'w2')], mode: 'enforce' as const, hint: 'Enable Euclidean enforcement and inspect the derived cluster edges.', formal: '∀w,v,u: (wRv ∧ wRu) → vRu.' },
] as const

const frameLessons: readonly LearnLesson[] = propertySpecs.map((spec) => lesson('frames-axioms', `frame-${spec.id}`, spec.title, `Recognize, repair, and inspect ${spec.id} structure on a concrete finite frame.`, {
  heading: `${spec.title} starts in the graph`, intuitive: `First inspect the almost-${spec.id} relation, then repair it and compare the matching modal axiom on this finite instance.`, formal: spec.formal, formula: spec.formula, keyPoints: ['Recognize the missing relational condition.', spec.mode === 'enforce' ? 'Use closure and inspect DERIVED edges.' : 'Repair the explicit relation.', 'The final correspondence result is an instance check, not a general proof.'], warning: 'Agreement on this finite frame illustrates but does not prove the general correspondence theorem.',
}, {
  instruction: `${spec.hint} Then verify the axiom/property instance.`, formula: spec.formula, scope: 'correspondence', targetTruth: true, evaluationWorld: 'w0', correspondencePreset: spec.preset, worlds: spec.worlds, edges: spec.edges,
  frameRules: spec.mode === 'validate' ? { [spec.id]: 'validate' } : undefined, requiredFrameRules: spec.mode === 'enforce' ? { [spec.id]: 'enforce' } : undefined,
  constraints: { requiredProperties: [spec.id], ...(spec.id === 'serial' ? { requiredEdges: [edge('w0', 'w1'), edge('w1', 'w1')], maximumEdges: 2 } : {}) }, editable: spec.id === 'serial' ? ['edges'] : ['constraints'], workspacePresentation: { edges: true },
}, hints('Inspect the relation before changing it.', spec.hint, 'Read formula validity, relational property, and instance comparison separately.'), `The repaired finite frame is ${spec.id}, and the corresponding axiom agrees on this instance. This is not a proof of the general theorem.`))

const recap = (questions: readonly ConceptQuestion[]) => questions

export const foundationChapters: readonly LearnChapter[] = [
  { id: 'necessity', title: 'Necessity', description: 'Understand universal truth, counterexample successors, and vacuous box truth.', prerequisiteChapterIds: ['possibility'], lessons: necessityLessons, completionSummary: ['□φ checks every accessible successor.', 'One accessible counterexample falsifies box.', 'At a dead end box is vacuously true.'], nextPreview: 'Continue to Box and Diamond.', recapQuestions: recap([
    { prompt: 'If M,w ⊨ □p, must p hold at every world in M?', choices: ['Yes', 'No, only at successors of w'], correctChoice: 'No, only at successors of w', explanation: 'Box quantifies only over worlds accessible from the evaluation world.' },
    { prompt: 'What falsifies □p at w?', choices: ['One accessible non-p world', 'One inaccessible non-p world'], correctChoice: 'One accessible non-p world', explanation: 'A counterexample must be in the successor set of w.' },
    { prompt: 'What is □p at a world with 0 successors?', choices: ['True', 'False'], correctChoice: 'True', explanation: 'There is no successor that violates p.' },
  ]) },
  { id: 'nested-modalities', title: 'Box and Diamond', description: 'Contrast box and diamond, verify dualities, and follow nested modal paths.', prerequisiteChapterIds: ['necessity'], lessons: [...boxDiamondLessons, ...nestedLessons], completionSummary: ['Box and diamond quantify differently over the same successors.', '◇φ ≡ ¬□¬φ and □φ ≡ ¬◇¬φ.', 'Each nested modal layer changes the current evaluation world.'], nextPreview: 'Continue to Countermodels.', recapQuestions: recap([
    { prompt: 'Does ◇p imply ◇◇p on every frame?', choices: ['Yes', 'No'], correctChoice: 'No', explanation: 'The p-witness need not itself have a p-successor.' },
    { prompt: 'Can □p and ◇p both be true?', choices: ['Yes, with a nonempty all-p successor set', 'No'], correctChoice: 'Yes, with a nonempty all-p successor set', explanation: 'All successors satisfy p and at least one successor exists.' },
    { prompt: 'Which is equivalent to ◇p?', choices: ['¬□¬p', '□¬p'], correctChoice: '¬□¬p', explanation: 'Possibility and necessity are dual under negation.' },
  ]) },
  { id: 'models-countermodels', title: 'Countermodels', description: 'Find, build, compare, and simplify countermodels without overstating minimality.', prerequisiteChapterIds: ['nested-modalities'], lessons: countermodelLessons, completionSummary: ['A countermodel names a frame, valuation, and critical world.', 'The failure may come from scope, valuation, relation, or world selection.', 'Non-isomorphic countermodels can refute the same claim.'], nextPreview: 'Continue to Local, Global, and Frame Truth.', recapQuestions: recap([
    { prompt: 'How many counterexamples are needed to refute model-global truth?', choices: ['One failing world', 'Every world'], correctChoice: 'One failing world', explanation: 'A universal model-global claim is refuted by one world.' },
    { prompt: 'Does a smaller found countermodel prove absolute minimality?', choices: ['Yes', 'No'], correctChoice: 'No', explanation: 'Finite simplification is not a proof against every possible model.' },
    { prompt: 'What extra object does a frame-validity counterexample provide?', choices: ['A countervaluation', 'A new modal operator'], correctChoice: 'A countervaluation', explanation: 'Frame validity quantifies over all valuations.' },
  ]) },
  { id: 'semantic-scopes', title: 'Local, Global, and Frame Truth', description: 'Compare pointed truth, model-global truth, and finite-frame validity side by side.', prerequisiteChapterIds: ['models-countermodels'], lessons: scopeLessons, completionSummary: ['M,w ⊨ φ fixes one world.', 'M ⊨ φ checks every world under one valuation.', 'F ⊨ φ checks every world under every valuation.'], nextPreview: 'Continue to Frame Properties.', recapQuestions: recap([
    { prompt: 'Which scope keeps the displayed valuation fixed but checks every world?', choices: ['Model-global', 'Frame-valid'], correctChoice: 'Model-global', explanation: 'Frame validity additionally varies the valuation.' },
    { prompt: 'Can local truth hold while model-global truth fails?', choices: ['Yes', 'No'], correctChoice: 'Yes', explanation: 'Another world can be a global counterexample.' },
    { prompt: 'Is the displayed valuation the only one checked for F ⊨ φ?', choices: ['Yes', 'No'], correctChoice: 'No', explanation: 'Finite-frame validity enumerates all valuations.' },
  ]) },
  { id: 'frames-axioms', title: 'Frame Properties', description: 'Recognize and repair frame properties before comparing their modal axioms.', prerequisiteChapterIds: ['semantic-scopes'], lessons: frameLessons, completionSummary: ['Frame properties constrain R, not the displayed valuation.', 'Closure adds derived rather than explicit edges.', 'A finite instance check is not a proof of a correspondence theorem.'], recapQuestions: recap([
    { prompt: 'Which property says every world accesses itself?', choices: ['Reflexive', 'Serial'], correctChoice: 'Reflexive', explanation: 'Reflexivity requires wRw for every w.' },
    { prompt: 'Does checking axiom 4 on one finite transitive frame prove the general theorem?', choices: ['Yes', 'No'], correctChoice: 'No', explanation: 'It is one illustrating instance.' },
    { prompt: 'What label identifies closure-generated arrows?', choices: ['DERIVED', 'SELECTED'], correctChoice: 'DERIVED', explanation: 'Derived edges are computed by enforced frame rules.' },
  ]) },
]
