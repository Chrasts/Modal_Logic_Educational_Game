# Learn Modal Logic

`Learn Modal Logic` is a data-driven semantic course, separate from How to Play, practice, and campaigns.

Course data lives in `src/learn.ts`. A chapter declares prerequisites, lessons, completion recap text, and a next-chapter preview. A lesson contains its concept material, optional worked example, prediction, workspace task, three progressive hints, feedback, and an optional transfer task. The six-step **How to Play** control tutorial lives separately in `src/campaign.ts` and sends completion here. **Possibility** is the first fully authored semantic vertical slice. The remaining chapters are intentional placeholders rather than partially implemented content.

Progress is stored locally under the versioned `logic-game:learn-progress:v1` key. It records completed lessons and chapters, attempts, predictions, hint use, optional transfer completion, and timestamps. Existing practice/campaign progress is intentionally kept separate, so no older completion is mistakenly treated as course completion.

The workspace remains the single source of truth for model construction and formula evaluation. Course lessons supply constrained `GameLevel` tasks to that workspace rather than implementing a second modal evaluator.

When authoring a further chapter, add fully specified `LearnLesson` objects and tests for formulas, initial models, constraints, and expected semantic outcomes before exposing the chapter in the browser.
