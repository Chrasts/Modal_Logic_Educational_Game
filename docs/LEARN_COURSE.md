# Learn Modal Logic (internal Learn engine)

`Learn Modal Logic` remains the internal data-driven lesson engine. In the UI it
is part of one **Learn Modal Logic** path: Welcome to Modal Logic, Learn the
Controls, and 9 chapters containing 50 lessons in this order: **Truth at a
World**, **Worlds and Accessibility**, **Possibility**, **Necessity**, **Box and
Diamond**, **Nested Modalities**, **Local, Global, and Frame Truth**, **Models
and Countermodels**, and **Frame Properties**. With the six controls lessons,
the complete available path contains 56 tasks. The in-app chapter and lesson totals are derived from
`learnCourse`, rather than maintained as separate counters.

Course data lives in `src/learn.ts`. A chapter declares prerequisites, lessons,
completion recap text, and a next-chapter preview. A lesson contains concept
material, an optional worked example, a shared-workspace task, three progressive
hints, feedback, and an optional transfer task. The six-step **How to Play**
control tutorial lives separately in `src/campaign.ts`. Its optional
`taskSteps` metadata renders a short ordered action checklist in the shared
mission header; it is not used by semantic lessons.

All 9 chapters above are available. Their recommended prerequisite chain is
linear, from Truth at a World through Frame Properties, but the
overview does not use prerequisites as hard locks.

## Chapter map

| Chapter | Lessons | Prerequisite | Goal and central misconception |
| --- | ---: | --- | --- |
| **Truth at a World** | 5 | — | Evaluate atoms and Boolean formulas locally; truth elsewhere does not settle truth at the selected world. |
| **Worlds and Accessibility** | 5 | Truth at a World | Build directed finite frames; an arrow does not imply its reverse. |
| **Possibility** | 5 | Worlds and Accessibility | Find an accessible witness; a matching but inaccessible world is irrelevant. |
| **Necessity** | 6 | Possibility | Check every successor, including vacuous truth at dead ends; one good branch is not enough. |
| **Box and Diamond** | 6 | Necessity | Compare possible truth profiles and modal dualities; □ and ◇ are not interchangeable. |
| **Nested Modalities** | 5 | Box and Diamond | Follow each modal step at its new world; quantifier order matters. |
| **Local, Global, and Frame Truth** | 5 | Nested Modalities | Separate one world, all worlds under one valuation, and all worlds under every valuation. |
| **Models and Countermodels** | 7 | Local, Global, and Frame Truth | Locate, complete, construct, and simplify countermodels at the requested scope. |
| **Frame Properties** | 6 | Models and Countermodels | Repair reflexive, serial, symmetric, transitive, and Euclidean relations independently of valuation. |

Identification lessons declare `interactionMode: 'question'`, keep the model
fixed, and require an explicit world, truth, countervaluation, or statement
answer. World choices happen only on the map and use **Confirm answer**.
Construction lessons use **Check task** and expose only the controls needed to
change the model. The final scope lesson uses reusable `scopeComparison`
metadata and reports pointed truth,
model-global truth, and frame validity side by side with a reason for each.
Frame validity always ranges over every valuation on the displayed finite
frame.

Progress is stored locally under the versioned `logic-game:learn-progress:v1`
key. Its independent `contentRevision` allows a targeted migration when an
authored lesson changes meaning without changing its stable ID. Revision 3
removes obsolete Modal Axioms lesson/chapter completion IDs while preserving
all still-known course completion and attempt data. Tutorial
progress remains under `logic-game:campaign-progress:v2`, with a separate
content-revision marker that reopens only the revised valuation control task.
Practice and General Challenges retain their existing IDs. Continuation checks
Welcome first, then the first unfinished control step, then the first unfinished
lesson in each available chapter order.

The workspace remains the single source of truth for model construction and formula evaluation. Course lessons supply constrained `GameLevel` tasks to that workspace rather than implementing a second modal evaluator.

The internal engines are not exposed as competing routes: players enter **Learn**
and return there after a lesson. Learn the Controls remains a separate six-step
control engine. Truth at a World and
Possibility lessons are semantic and retain their read-only formulas; Worlds
and Accessibility lessons are construction-only and validate their structural
constraints without a placeholder formula or semantic target controls.

Lesson progress and next/previous navigation are local to the current chapter;
completion stays in the mission panel while the map remains mounted and
unchanged. A fresh section shows Start, a partial section shows Continue and
Restart section, and every chapter card can expand to show its completed,
current, and unfinished lessons. Restart reopens current completion while keeping attempt history; Replay
does not clear progress. When authoring a further chapter, add fully specified
`LearnLesson` objects and tests for formulas, initial models, constraints, and
expected semantic outcomes before exposing the chapter in the browser.

## Mechanics tutorial versus semantic lessons

Learn the Controls teaches UI operations only: selection, evaluation-world
choice, valuation editing, drawing/correcting an edge, adding a world, and a
small combined construction. Later lessons must add a semantic concept, a
choice between alternatives, a more complex structure, a new error type, or a
meaningful combination of mechanics. Repeating the same initial model, edit,
and target state is not acceptable merely because the explanatory text differs.

The revised Worlds lessons build a three-world carrier, a two-pair directed
path, and an oriented three-world cycle. Possibility uses accessible and
inaccessible distractors, preserves unrelated edges during direction repair,
requires an explicit witness-world choice, and ends with a witness for
`◇(p ∧ q)` rather than another two-world `◇p` construction.

`createLevelFingerprint` in `src/level-fingerprint.ts` normalizes objective
kind, formula/target and required prediction, world count, valuations, edges,
edit permissions, primary and bonus constraints, frame rules, required
atoms/edges/properties, and evaluation world. The Learn data test
compares every Controls and Learn task. Any exact match must be explicitly
allowlisted in the test with a pedagogical justification; the current allowlist
is empty.

User-facing terminology is mode-specific: Learn uses **lesson**, Campaigns and
Practice use **mission**, and Sandbox uses neither. Individual successful checks
use **Task complete**.

Frame-validity and correspondence displays are exhaustive checks of the finite
frame instance currently shown, within the displayed valuation limit. They do
not prove a general correspondence theorem. Likewise, reduced models and
reference constructions are not claims of absolute mathematical minimality.
