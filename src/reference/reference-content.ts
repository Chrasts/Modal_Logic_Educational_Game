export const frameCorrespondences = [
  { system: 'T', axiom: '□p → p', condition: 'Reflexive: every w has wRw', intuition: 'What is necessary is true here.' },
  { system: 'D', axiom: '□p → ◇p', condition: 'Serial: every w has some successor', intuition: 'Necessity is never over an empty future.' },
  { system: 'B', axiom: 'p → □◇p', condition: 'Symmetric: wRv implies vRw', intuition: 'Accessible worlds can return.' },
  { system: '4', axiom: '□p → □□p', condition: 'Transitive: wRv and vRu imply wRu', intuition: 'Accessibility composes.' },
  { system: '5', axiom: '◇p → □◇p', condition: 'Euclidean: wRv and wRu imply vRu', intuition: 'Successors see one another.' },
] as const

export const glossary = [
  ['World', 'An element of W representing a possible state.'],
  ['Accessibility relation', 'The directed relation R between worlds.'],
  ['Successor', 'v is a successor of w when wRv.'],
  ['Predecessor', 'w is a predecessor of v when wRv.'],
  ['Valuation', 'A function assigning each atom the worlds where it is true.'],
  ['Evaluation world', 'The selected world used for pointed truth.'],
  ['Pointed model', 'A Kripke model together with one distinguished world.'],
  ['Frame', 'A pair ⟨W,R⟩ without a valuation.'],
  ['Model', 'A triple ⟨W,R,ν⟩ with a valuation.'],
  ['Satisfaction', 'The relation M,w ⊨ φ saying that φ is true at w.'],
  ['Validity', 'Truth throughout the stated scope, often across every valuation.'],
  ['Countermodel', 'A model and world where a claimed formula is false.'],
  ['Countervaluation', 'A valuation showing that a formula is not valid on a frame.'],
  ['Reflexive', 'Every world accesses itself.'],
  ['Symmetric', 'Every relation wRv has the reverse vRw.'],
  ['Transitive', 'wRv and vRu imply wRu.'],
  ['Serial', 'Every world has at least one successor.'],
  ['Euclidean', 'wRv and wRu imply vRu.'],
  ['Derived relation', 'A relation added by an enforced closure rather than drawn explicitly.'],
] as const

export const furtherReading = [
  { title: 'Boxes and Diamonds', source: 'Open Logic Project', href: 'https://bd.openlogicproject.org/', description: 'An open textbook devoted to modal logic and Kripke semantics.' },
  { title: 'Modal Logic', source: 'Stanford Encyclopedia of Philosophy', href: 'https://plato.stanford.edu/entries/logic-modal/', description: 'A broad scholarly overview of modal systems, semantics, and history.' },
  { title: 'Modal Logic', source: 'Blackburn, de Rijke, and Venema, Cambridge University Press', href: 'https://www.cambridge.org/core/books/modal-logic/F7CDB0A265026BF05EAD1091A47FCF5B', description: 'A comprehensive advanced text on modal languages and relational semantics.' },
  { title: 'Logic in Action', source: 'Logic in Action', href: 'https://www.logicinaction.org/', description: 'An open introduction connecting logic with computation and reasoning.' },
] as const
