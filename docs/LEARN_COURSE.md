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
hints, feedback, and an optional transfer task. The six-lesson **Learn the Controls**
section is defined in `src/campaign.ts`. Its optional
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
answer. World choices can be made in the graph or synchronized Table view and use **Confirm answer**.
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
Welcome first, then the first unfinished control lesson, then the first unfinished
lesson in each available chapter order.

The workspace remains the single source of truth for model construction and formula evaluation. Course lessons supply constrained `GameLevel` tasks to that workspace rather than implementing a second modal evaluator.

The internal engines are not exposed as competing routes: players enter **Learn**
and return there after a lesson. Learn the Controls remains a six-lesson section in that path. Truth at a World and
Possibility lessons are semantic and retain their read-only formulas; Worlds
and Accessibility lessons are construction-only and validate their structural
constraints without a placeholder formula or semantic target controls.

Lesson progress remains section-aware, while one global navigation resolver
orders all six Controls lessons followed by every semantic Learn lesson. Next
and Previous therefore cross Controls and chapter boundaries identically for a
fresh completion or a replay;
completion stays in the mission panel while the map remains mounted and
unchanged. Learn the Controls follows the same collection contract as semantic
chapters and expands its six existing tutorial levels inline. A fresh section
shows Start, a partial section shows Continue and Restart section, and every
collection card can expand to show its completed, current, and unfinished
lessons. Restart reopens current completion while keeping attempt history; Replay
does not clear progress. Start and Continue are primary actions, Replay is
secondary, and View/Hide lessons is tertiary. Once every available task is
complete, the progress block is the single course-completion message; there is
no inert completion box or no-op global Replay Learning button. Replay remains
granular by introduction, Controls section, semantic section, or lesson. When
authoring a further chapter, add fully specified
`LearnLesson` objects and tests for formulas, initial models, constraints, and
expected semantic outcomes before exposing the chapter in the browser.

## Mechanics tutorial versus semantic lessons

Learn the Controls teaches UI operations only: selection, evaluation-world
choice, valuation editing, drawing/correcting a relation, adding a world, and a
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
Practice use **mission**, and Model Sandbox uses neither. Individual successful checks
use **Task complete**.

Frame-validity and correspondence displays are exhaustive checks of the finite
frame instance currently shown, within the displayed valuation limit. They do
not prove a general correspondence theorem. Likewise, reduced models and
reference constructions are not claims of absolute mathematical minimality.

## Workspace-first lesson flow

Semantic lessons now open a compact concept dialog before mounting the existing
task workspace. It states the objective, intuition, formal rule, key points and
warning. A collapsed worked-example disclosure uses the same static
Kripke-diagram component used by candidate-model questions. The retired parallel
lesson view has been removed; all construction, questions, feedback and transfer
work use the shared workspace and evaluator.

Hints are progressive and explicit. Opening **Details & hints** does not count as
hint use; each reveal advances one level and records that level locally. A first
wrong answer gives targeted corrective feedback without exposing the complete
success explanation. Later attempts progressively add detail. Eligible lessons
may offer an optional transfer task after the main success, and transfer
completion is stored separately from required lesson completion. Prerequisites
remain visible recommendations rather than locks, and the Home/Continue route
resumes the current in-memory task before selecting another lesson.

Successful completion stays clean: it shows the lesson's positive explanation
without a post-success “Common mistake” warning. Check task produces an immediate
text-and-icon success or not-yet state; optional truth-by-world evidence and the
semantic debugger remain available through **Semantic details**.
