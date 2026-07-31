# Intro to Modal Logic (internal Learn engine)

`Learn Modal Logic` remains the internal data-driven lesson engine. In the UI it
is presented as the **Intro to Modal Logic** campaign block, separate from the
short How to Play tutorial, General Challenges, and Practice Library.

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

Progress is stored locally under the versioned `logic-game:learn-progress:v1` key. It records completed lessons and chapters, attempts, predictions retained from older content, hint use, optional transfer completion, and timestamps. Existing progress is preserved: Intro uses this store, while tutorial, Practice, and General Challenges retain their existing separate progress IDs.

The workspace remains the single source of truth for model construction and formula evaluation. Course lessons supply constrained `GameLevel` tasks to that workspace rather than implementing a second modal evaluator.

The internal machinery is not exposed as a normal route: players enter the
**Intro to Modal Logic** section of Campaigns and return there after a lesson.
How to Play remains a separate six-step control tutorial. Truth at a World and
Possibility lessons are semantic and retain their read-only formulas; Worlds
and Accessibility lessons are construction-only and validate their structural
constraints without a placeholder formula or semantic target controls.

When authoring a further chapter, add fully specified `LearnLesson` objects and tests for formulas, initial models, constraints, and expected semantic outcomes before exposing the chapter in the browser.
