# Learn Modal Logic (internal Learn engine)

`Learn Modal Logic` remains the internal data-driven lesson engine. In the UI it
is part of one **Learn Modal Logic** path: Welcome to Modal Logic, Learn the
Controls, Truth at a World, Worlds and Accessibility, and Possibility.

Course data lives in `src/learn.ts`. A chapter declares prerequisites, lessons,
completion recap text, and a next-chapter preview. A lesson contains concept
material, an optional worked example, a shared-workspace task, three progressive
hints, feedback, and an optional transfer task. The six-step **How to Play**
control tutorial lives separately in `src/campaign.ts`. Its optional
`taskSteps` metadata renders a short ordered action checklist in the shared
mission header; it is not used by semantic lessons.

Available introductory campaigns are **Truth at a World**, **Worlds and
Accessibility**, and **Possibility**. Possibility has no How to Play dependency
and opens directly in the workspace. Necessity, Box and Diamond, Countermodels,
Local, Global, and Frame Truth, and Frame Properties remain intentional
coming-later cards rather than empty campaigns.

Progress is stored locally under the versioned `logic-game:learn-progress:v1`
key. Its independent `contentRevision` allows a targeted migration when an
authored lesson changes meaning without changing its stable ID. Revision 2
reopens only the revised Worlds and Possibility lessons and their section
completion; unrelated completion and attempt history remain intact. Tutorial
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
completion presents a section transition rather than silently crossing a
chapter boundary. A fresh section shows Start, a partial section shows Continue
and Restart section, and a completed section shows Replay section plus its
recap. Restart reopens current completion while keeping attempt history; Replay
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
