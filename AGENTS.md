# General Codex Working Instructions

## Scope and efficiency

- Start with the smallest amount of repository context needed to solve the task.
- Do not scan, index, summarize, or inspect the entire repository by default.
- Expand the search only when the task logically requires it, when dependencies are unclear, or when the initial evidence is insufficient.
- Prefer targeted inspection of named files, relevant directories, imports, references, tests, and error traces.
- Reuse information already established in the current session instead of repeatedly rereading the same files.

## Before editing

when/if editing:
- Identify the concrete objective, affected area, constraints, and success criteria.
- For ambiguous or potentially broad tasks, briefly state the intended scope before making extensive changes.
- Do not redesign architecture, replace technologies, or perform broad cleanup unless explicitly requested or clearly necessary for correctness.
- Preserve existing conventions and make the smallest coherent change that solves the problem.

## Implementation

When/if implementing:
- Work in focused, reviewable units.
- Avoid unrelated refactoring, formatting churn, generated-file changes, and speculative improvements.
- Prefer modifying existing abstractions over introducing new ones without a clear need.
- When a task becomes substantially larger than expected, stop and explain why before expanding scope.
- Do not repeatedly attempt the same failing approach; reassess the evidence and change strategy.

## Verification


When/if verifying:
- Run the narrowest relevant checks first: targeted tests, type checks, linters, or a minimal reproduction.
- Broaden verification only when risk, shared dependencies, or project conventions justify it.
- Never claim that a change works unless it was verified; distinguish completed checks from checks that could not be run.
- Report any remaining uncertainty, failing checks, or assumptions that materially affect the result.

## Communication

When/if comunicating changes:
- Keep progress reports concise and substantive.
- At completion, summarize:
  1. what changed,
  2. which files were affected,
  3. what was verified,
  4. any unresolved risks or recommended next step.
- Do not produce long repository overviews unless requested.

## Priority

Task-specific user instructions and more specific nested `AGENTS.md` files override these general rules.
Correctness and necessary investigation take priority over minimizing context or tool usage.
