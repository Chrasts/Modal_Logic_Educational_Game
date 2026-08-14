# For educators

Logic Model Builder is an interactive modal-logic laboratory and puzzle game for basic unimodal propositional logic over finite Kripke models.

## Learning path

The foundations course moves from worlds, valuations, and accessibility to possibility and necessity, □/◇ contrasts and dualities, nested modalities, countermodels, local/model-global/frame truth, and elementary frame properties. Learners should already be comfortable with propositional connectives before the later chapters.

Recommended use is a short instructor introduction followed by individual questions, construction, verification, and explanation. Read-only questions use **Confirm answer**, while model-building tasks use **Check task**. The chapter recaps are useful as retrieval practice because they do not depend on operating the graph editor. Ask learners to justify witnesses for ◇, counterexamples for □, and the quantifier change between `M,w ⊨ φ`, `M ⊨ φ`, and `F ⊨ φ`.

## Common misconceptions

- `□p` at `w` concerns successors of `w`, not every world in the model.
- A successor relation is directed.
- An empty successor set makes `□φ` vacuously true but `◇φ` false.
- Local truth does not imply model-global truth; one displayed valuation does not establish frame validity.
- A finite frame check can illustrate a modal principle or correspondence but is not a proof of the general theorem.
- A reduced countermodel is not claimed to be absolutely minimal.

## Assessment and limits

Use editor-free pre/post questions and, if possible, a delayed retention check; see [PILOT_PROTOCOL.md](PILOT_PROTOCOL.md). The local result export contains attempts and interaction-derived categories. It cannot by itself measure understanding, identify why a learner clicked, or establish instructional effectiveness.

The tool has no solver for infinite frames and does not prove general correspondence or absolute model minimality. Frame validity exhaustively checks the finite frame currently shown, subject to the displayed valuation-cost limit.

## Authoring a mission

Open **Create** from More and use the guided studio in order:

1. State the learning objective, learner instruction, concept tags, prerequisites, and difficulty.
2. Build the learner's initial model in the same workspace used during play, then save and return.
3. Choose the formula, semantic scope, target truth value, and evaluation world.
4. Select exactly which model controls learners may edit.
5. Add visible size, relation, atom, frame-property, change-budget, and optional bonus constraints.
6. Add an optional prediction interaction when it supports the objective.
7. Build a reference solution from the saved start. The studio stores it only after semantic and constraint verification.
8. Playtest as a learner, return to authoring, and run the mission audit in both desktop and mobile preview modes.
9. Export a versioned mission, create a fragment share link, or add audited missions to an ordered campaign package.

Authoring workspace visits and playtests are intentionally separate from learner
progress and attempt history. Import existing custom content from the Create
landing. Use **Data** only for local progress backup, sandbox-model transfer, and
resets.
