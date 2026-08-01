# Intro to Modal Logic (internal Learn engine)

`Learn Modal Logic` remains the internal data-driven lesson engine. In the UI it
is part of one **Learn Modal Logic** path: Welcome to Modal Logic, Learn the
Controls, Truth at a World, Worlds and Accessibility, and Possibility.

Course data lives in `src/learn.ts`. A chapter declares prerequisites, lessons,
completion recap text, and a next-chapter preview. A lesson contains concept
material, an optional worked example, a shared-workspace task, three progressive
hints, feedback, and an optional transfer task. The six-step **How to Play**
control tutorial lives separately in `src/campaign.ts`.

Available introductory campaigns are **Truth at a World**, **Worlds and
Accessibility**, and **Possibility**. Possibility has no How to Play dependency
and opens directly in the workspace. Necessity, Box and Diamond, Countermodels,
Local, Global, and Frame Truth, and Frame Properties remain intentional
coming-later cards rather than empty campaigns.

Progress is stored locally under the versioned `logic-game:learn-progress:v1` key. Its optional `welcomeViewed` field is backward compatible with existing progress. Tutorial progress remains under `logic-game:campaign-progress:v2`; Practice and General Challenges retain their existing IDs. Continuation checks Welcome first, then the first unfinished control step, then the first unfinished lesson in each available chapter order.

The workspace remains the single source of truth for model construction and formula evaluation. Course lessons supply constrained `GameLevel` tasks to that workspace rather than implementing a second modal evaluator.

The internal engines are not exposed as competing routes: players enter **Learn**
and return there after a lesson. Learn the Controls remains a separate six-step
control engine. Truth at a World and
Possibility lessons are semantic and retain their read-only formulas; Worlds
and Accessibility lessons are construction-only and validate their structural
constraints without a placeholder formula or semantic target controls.

Lesson progress and next/previous navigation are local to the current chapter;
completion presents a section transition rather than silently crossing a
chapter boundary. When authoring a further chapter, add fully specified
`LearnLesson` objects and tests for formulas, initial models, constraints, and
expected semantic outcomes before exposing the chapter in the browser.
