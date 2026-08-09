# Development Guide

This document contains implementation and contributor information for Logic
Model Builder. The main README is intentionally focused on the playable game.

## Commands

```bash
npm install
npm run dev        # local development server
npm test           # run the test suite once
npm run test:watch # rerun tests while files change
npm run build      # type-check and create a production build
```

On Windows systems where PowerShell blocks `npm.ps1`, invoke the same scripts
through `npm.cmd`, for example `npm.cmd test`.

## Architecture

```text
src/
├── logic/
│   ├── formula.ts       # typed modal-formula AST
│   ├── parser.ts        # tokenizer and precedence parser
│   ├── model.ts         # finite Kripke models
│   ├── evaluate.ts      # local semantics and recursive evaluation traces
│   ├── validity.ts      # model-global and finite-frame validity
│   ├── frame.ts         # frame closure and property validation
│   ├── objective.ts     # semantic game objectives and verdicts
│   └── constraints.ts   # reusable level construction constraints
├── campaign.ts          # data-driven tutorial and campaign missions
├── components/
│   └── MissionHeader.tsx # shared guided lesson/mission header
├── level-fingerprint.ts # normalized duplicate-content audit helper
├── level-format.ts      # versioned validation for shared custom missions
├── test/                # shared UI test setup
├── App.tsx              # application shell and model editor
└── main.tsx             # React entry point
```

The logic modules do not depend on React or React Flow. Campaign and tutorial
missions are declarative data consumed by the same objective and constraint
engine used by the sandbox.

`GameLevel.objectiveKind` distinguishes normal semantic objectives from narrow
construction-only objectives. A construction level omits `formula`, `scope`,
and `targetTruth`; `validateLevelObjective` rejects ambiguous combinations.
Its normal verification path applies existing construction constraints followed
by `verifyConstructionObjective`, without invoking the formula evaluator.
`workspacePresentation` declares the focused Learn controls (`worlds`,
`valuations`, `edges`, and `evaluation`) so absent panels are not merely
disabled or keyboard-focusable. Existing semantic/custom formats remain
compatible because semantic fields and custom-file parsing are unchanged.

Home and global navigation direct newcomers to Learn. The Home Learn button has
one visible word and a descriptive accessible name; progress and the next lesson
are siblings rather than button content. Campaigns keeps its selected General
Challenges or Practice Library section in component state. `MissionHeader`
keeps one objective and Check task visible for every guided mode, while details,
analysis, hints, reference solutions, and authored visible constraints live in
one on-demand popover. Historical completion is kept separately from the current
pending/success/failure attempt.

Learn overview actions are state-specific: Start when untouched, Continue plus
Restart section when partial, and Replay section plus recap when complete.
Restart removes only current completion markers for that section and preserves
attempt counters; Replay never clears historical progress.

Guided workspaces open Verification by default. Formula controls are omitted,
and `workspacePresentation` plus edit permissions determine whether Worlds,
Valuations, Accessibility, and their toggle are rendered at all. Sandbox omits
`MissionHeader`, retains the full panels, and uses Verify objective.

## Verification scopes

- **Pointed:** evaluates `M,w ⊨ φ` at the designated world.
- **Model-global:** evaluates `M ⊨ φ` at every world under the current valuation.
- **Frame validity:** evaluates `F ⊨ φ` at every world under every valuation.
- **Correspondence:** compares finite-frame validity with a selected relational
  property on the current frame and reports both sides separately.

Finite-frame validity enumerates valuations and is exponential in the number of
worlds and atoms. Interactive checks are capped at 65,536 valuations to prevent
impractically long work on the browser's main thread.

## Frame rules

A frame rule can be off, validated without changing the relation, or enforced
by adding derived edges. Reflexivity, symmetry, transitivity, and Euclideanness
support enforcement. Seriality, irreflexivity, and acyclicity are validation-only
because repairing them can require arbitrary choices or deleting explicit data.

## Persistence

Sandbox state and mission progress are stored in browser `localStorage`. There
is currently no backend, account system, or cross-device synchronization. The
Data dialog can reset these stores independently and export or import versioned
model JSON. Imports validate formulas, world identifiers, atoms, relations, and
supported frame-rule modes before changing the sandbox.

How to Play uses `logic-game:campaign-progress:v2`. On first load it reads the
former v1 progress when necessary, preserves recognised practice and campaign
mission IDs, and intentionally drops only the obsolete semantic tutorial IDs:
they do not map safely to the six UI-control steps.

Authored-content revisions are tracked separately from storage schema versions.
`logic-game:campaign-content-revision:v1` reopens only changed tutorial IDs,
while `LearnProgress.contentRevision` does the same for changed course lessons
and affected chapter-completion markers. This keeps stable IDs without allowing
old completion to skip a materially rewritten task.

An anonymous guest profile stores a random local identifier and up to 250 recent
verification attempts. It does not use IP addresses or browser fingerprinting.
Profile backups contain history and learning progress and can be restored in a
different browser through the same Data dialog.

## Verification diagnostics

Objective verdicts include structured truth values for every world under the
relevant valuation. Failed frame-validity checks additionally expose the full
countervaluation separately from the prose explanation. Each relevant local
evaluation also returns a recursive tree containing the active subformula,
world, semantic rule, truth value, child evaluations, and focused diagnostics.
The UI renders this trace as a nested, expandable evaluation tree.

The evaluator deliberately records both Boolean children and every accessible
successor checked by `□` or `◇`, rather than retaining only the first decisive
branch. This makes the trace useful for teaching while preserving the same
truth-functional result.

## Formula-equivalence objectives

An optional `comparisonFormula` changes the configured semantic target from a
single-formula truth check to an equivalence check. Pointed equivalence compares
both truth values at the evaluation world. Model-global equivalence compares
them at every world under the displayed valuation. Frame equivalence checks the
biconditional at every world under every valuation and returns a distinguishing
countervaluation when it fails. Correspondence objectives intentionally cannot
be combined with formula equivalence.

## Solution diversity and isomorphism

Successful guided or custom missions receive a canonical finite-structure
signature in the local guest profile. Canonicalization ignores world names and
coordinates. It preserves explicit semantic relation edges and preserves
valuations for pointed/model objectives; frame and correspondence solutions
ignore the displayed valuation. Pointed objectives additionally preserve the
designated evaluation world. The current exact permutation algorithm is capped
at eight worlds, and diversity tracking is skipped—not mission verification—if
that limit is exceeded. At most 25 signatures are retained per mission.

Successful and failed attempt history also stores transparent construction
metrics: world count, distinct explicit-edge count, true `(world, atom)`
memberships, and—when a level baseline exists—the semantic-change count defined
by `maximumChanges`. These are descriptive measurements. The UI deliberately
does not collapse them into an arbitrary score or label a solution minimal.

Attempt history stores the active mission concept and a stable failure category
when verification does not complete. Current categories distinguish missing or
incorrect required answers, construction constraints, frame-rule configuration,
relational-property validation, semantic objectives, and syntax/model-data
errors. The profile aggregates successes/attempts by concept and counts these
categories locally. This is diagnostic history, not an inference about a
student's knowledge or a substitute for pedagogical assessment.

## Generated frame tests and validity cost

The generated-frame regression suite enumerates every relation on one, two, and
three worlds. It checks that each enforceable closure is extensive and actually
satisfies its property, and independently confirms the finite correspondences
T/reflexive, D/serial, B/symmetric, 4/transitive, and 5/Euclidean on every such
frame. This is deterministic exhaustive small-model testing rather than random
sampling.

The workspace previews frame-search cost as `2^(|W|·|Atoms|)` valuations using
the union of atoms in both formulas. Searches above
`DEFAULT_MAXIMUM_VALUATIONS` are disabled before execution with an explicit
message; the engine retains the same limit as a defensive invariant.

## Optional mission bonuses

A level may define `bonusConstraints` in addition to its required construction
constraints. Bonus conditions do not block completion and are not shown before
the primary objective is verified.

## Prediction interactions

A level may optionally require a prediction before verification. The current
interaction kinds ask for either the formula's truth value or a counterexample
world. Predictions do not alter the modal semantics or replace the objective;
they are compared with the structured verdict after the construction has been
evaluated. This discourages blind trial and error while keeping solution hints
out of the mission briefing.

The `frame-property` interaction presents an author-specified set of relational
properties and compares the player's answer with `expectedProperty`. With
`mustBeCorrect: true`, the semantic objective and the answer must both succeed
before completion. The expected answer remains level metadata, not an inference
silently guessed from a relation that may violate several properties at once.

The `countervaluation` interaction stores two or more complete valuations with
stable choice identifiers. Import validation requires every choice to assign an
atom list to every mission world and requires `expectedChoice` to reference one
of those choices. With `mustBeCorrect`, selecting the correct concrete
assignment is part of completion rather than optional prediction feedback.

The `model-choice` interaction stores two or more self-contained finite pointed
models. Each candidate has its own worlds, atom lists, explicit relation, and
evaluation world. Import validation is independent for every candidate, so a
candidate cannot reference worlds from either the playable level or another
choice. The expected choice is authored explicitly because the prompt may ask
about any supported semantic property, not only the level's primary formula.

## Custom mission files

Custom missions use the versioned `logic-model-builder-level` JSON format. The
authoring workflow captures two independent workspace snapshots: the initial
state delivered to the player and, optionally, a reference solution. Before the
solution is stored, the engine checks the objective, construction constraints,
required frame-rule modes, and active relational rules. Importing a mission
loads only the initial state; the solution is metadata and is never applied to
the player workspace. Because JSON is inspectable, it should not be treated as
secret or tamper-proof answer storage.

`Playtest as player` validates the same serialized package used for download,
then launches its initial snapshot through the normal custom-mission loader.
Leaving the playtest restores the author workspace. `Restore captured start`
is intentionally destructive and therefore asks for confirmation.

The editor also captures the author-facing title, instruction and learning
objective, plus the parts a player may edit. Authors can set world and
edge bounds, required or forbidden frame properties, a prediction interaction,
required or forbidden edges and atom assignments, and an optional maximum-edge
bonus. Edge constraints use `source -> target`; atom constraints use
`world: p q`, with commas, semicolons, or new lines separating entries where
appropriate. Imports validate the formula, semantic
scope, worlds, relation, evaluation world, frame rules, correspondence preset,
constraints, prediction, bonus, and edit permissions before opening the mission.

The editor rejects constraints that require and forbid the same edge, atom, or
frame property before a mission file is exported or launched.

## Custom campaign packages

The versioned `logic-model-builder-campaign` format contains an ordered list of
complete `logic-model-builder-level` files, so each mission retains its own
constraints and optional reference solution. Import validates every nested
mission and rejects duplicate mission ids before launching the package as one
custom sequence. The Data dialog can collect the currently authored mission,
remove collected entries, and download the ordered package. Package metadata is
descriptive; progress continues to be keyed by the nested mission ids.

## Share URLs

Mission and campaign JSON can be UTF-8 encoded as URL-safe Base64 in the
`#share=` fragment. Browsers do not send fragments in HTTP requests, so the
payload remains client-side and requires no storage backend. On initial load,
the app decodes and runs the same versioned parser used by pasted JSON before
launching the shared sequence. Payloads above 60,000 encoded characters are
rejected with a recommendation to use the downloadable file, since practical
URL limits vary across browsers and messaging services.

`maximumChanges` is a baseline-relative construction constraint. It counts the
symmetric differences in world identifiers, distinct explicit relation pairs,
and `(world, atom)` memberships. Coordinates are presentation data and never
count as semantic changes. This deliberately describes a semantic edit budget,
not mouse clicks or undo-history entries.

## Local educator export

The Profile screen can export its last 250 locally stored attempts as CSV. Each
row includes the pseudonymous guest id, mission and scope, outcome, diagnostic
category, model size, semantic-change count, and optional bonus result. Authored
text is quoted and values beginning with spreadsheet formula characters are
prefixed with an apostrophe to avoid CSV formula injection.

This is deliberately a browser-local hand-off, not telemetry or an account
system. There is no backend, IP-based identity, automatic collection, or
cross-device synchronization; the player decides whether to share the file.

Semantic failures are classified from the structured verdict and evaluation
trace rather than from rendered prose. Categories distinguish a target reached
at the wrong pointed world, missing or unwanted diamond witnesses, boxed
counterexample successors, vacuous box truth, model-global counterexamples,
frame countervaluations, all-valuations confusion, and correspondence mismatch.

## Current technical scope

The project works with explicit finite frames. It does not currently include an
external solver, proof of model minimality, or a formal notation
for regular infinite frames. These are possible extensions rather than hidden
requirements of the existing engine.

The production build separates React, React Flow, and application code into
cacheable chunks. This keeps each initial JavaScript asset below the configured
500 kB warning threshold while retaining relative URLs for GitHub Pages.

The application shell keeps the global header outside the main landmark and
provides a keyboard-visible skip link. Interactive controls share a high-contrast
focus-visible treatment, result changes are exposed as atomic live regions, and
the existing reduced-motion media query suppresses non-essential transitions.

Fullscreen is an optional progressive enhancement using the browser Fullscreen
API. It is a direct icon button in the global topbar and is omitted when the API
is unavailable; it is not duplicated in More. The label and `aria-pressed`
state follow `fullscreenchange`. The game remains fully usable in the normal
browser viewport.

Overlay layering is defined once in `:root`: canvas `0`, workspace panels `10`,
mission header `20`, topbar `40`, popovers `60`, modal backdrop `80`, modal `90`,
and toast/skip-link `100`. The topbar is a positioned stacking context above the
mission and workspace layers, and neither it nor the More container clips
overflow, so the current in-tree More popover does not require a portal. More
closes on outside pointer input and Escape; Escape restores focus to its trigger.
If future containment or transforms trap the popover, it should be portalled to
`document.body` and positioned from the trigger rectangle rather than adding an
arbitrary larger z-index.

## Interface hierarchy

The workspace is styled as one visual workbench rather than five equally weighted
cards. The graph is the primary surface, editing panels use quieter elevation,
and verification closes the left-to-right task flow with a petrol accent. Global
navigation uses a compact segmented treatment; destructive and negative states
reserve the brown accent. Short entrance and result transitions clarify state
changes and are disabled by the reduced-motion preference.

The initial app view is a concise home menu. The global topbar destinations are
Home, Learn, Campaigns, Sandbox, and Modal Logic Guide, followed by fullscreen
and More. More contains Create, Profile, Data, Settings, and GitHub. Learn owns
the Welcome, Learn the Controls, and data-driven semantic chapters; Campaigns
owns General Challenges and the non-linear Practice Library. Introductory
structural lessons use ordinary `GameLevel`
constraints (exact worlds and required/forbidden edges) together with the same
deterministic evaluator as semantic missions; no second workspace exists. Shared
URL fragments remain direct navigation instructions and therefore launch the
validated custom mission or campaign without stopping at Home. Interface
settings are versioned separately from sandbox and learning data.

Guided workspaces keep the graph tall with one mode-accented `MissionHeader`.
There is no second campaign/context strip. Briefings, formulas, target analysis,
hints, reference solutions, and learning objectives live in **Details & hints**.
Desktop sidebars are deliberately narrower than the graph and can still be
collapsed. Learn navigation says lesson, Campaigns/Practice says mission, and
Sandbox has no unit terminology.

`GameLevel.interactionMode` explicitly separates `construction` tasks from
read-only `question` tasks. Do not infer this distinction from an empty
`editable` array or from prediction metadata. Question answers remain in the
mission panel; `world-choice` and `counterexample-world` answers are selected
only on the map. Learn completion also stays in the mission panel so React Flow
remains mounted and its viewport/model state is preserved.

The workspace tour is stored under `logic-game:workspace-tour:v1` and can be
reopened from More or Guide without deleting the persistence key or changing the
active mission. `workspace/map-interactions.ts` classifies browser wheel events:
Ctrl-wheel is treated as pinch, fine pixel/2D deltas as touchpad pan, and coarse
or line/page deltas as mouse-wheel zoom. This is necessarily a heuristic because
browsers do not expose a reliable hardware source. Both trackpad axes are always
applied; wheel and pinch zoom are anchored under the pointer and clamped to the
shared min/max. Native React Flow drag-pan and touch pinch remain enabled.

`world-placement.ts` provides deterministic collision-aware spawn positions.
Toolbar creation prefers the selected world, otherwise the viewport centre;
desktop pane double-click supplies an exact preferred flow coordinate. Manual
drag overlap is allowed and only receives transient visual feedback.

`relation-presentation.ts` groups displayed directed reverse pairs without
changing stored relation data. A pair is collapsed into one two-arrow edge until
clicked; expanded directions reuse reverse-pair routing. Filled markers mean
explicit and open brown markers mean derived. Hiding derived edges happens before
grouping. The custom modal edge router still handles horizontal, near-vertical,
reverse-pair, and self-loop paths with a 22px interaction width.

`model-layout.ts` implements deterministic breadth-first Tidy layout with stable
component ordering. Tidy saves one history snapshot and preserves verification;
Fit changes only the React Flow viewport. Position-only history entries preserve
the current result through undo/redo.

Manual map QA before release:

- Chrome and Edge on a real trackpad: two-finger scrolling pans in both axes,
  mouse wheel zooms under the pointer, pinch zooms faster, and scrolling outside
  the map moves the page normally.
- Double-click empty desktop map space creates one world at the expected flow
  coordinate, while nodes, edges, touch input, and locked missions do not.
- Reverse pairs collapse to one relation, expand on click, preserve direction
  marker provenance, and collapse through Escape or a pane click.
- Tidy is one undo/redo step, does not change semantics or verification, and Fit
  does not create a history entry.
- A self-loop is visibly outside its world, can be selected through its wide
  hit area, and Backspace/Delete removes only the edge when editing is allowed.
- Near-vertical arrows, reverse pairs, and arrowheads remain separated while
  dragging worlds; question tasks never mutate the model.

The duplicate-content audit uses `createLevelFingerprint`. It ignores layout
coordinates and normalizes world names, valuations, edges, objectives and
required predictions, edit permissions, primary/bonus constraints, frame
rules, and required evaluation state. Tests compare Controls
with all Learn tasks and require any exact duplicate to be documented in an
explicit allowlist.

## Release gates

Pull requests and pushes to `main` run `npm ci`, `npm test`, `npm run build`, and
a high-severity production-dependency audit in `.github/workflows/ci.yml`.
The Pages deployment independently repeats install, tests, and build before it
uploads `dist`; deployment therefore cannot proceed from a failed test job.
Repository administrators should enable branch protection for `main` and make
the CI `test-and-build` check required. That setting lives on GitHub and cannot
be enforced by files in this repository alone.

For a local release run the same three commands from a clean install. Smoke
coverage must keep the homepage, Learn, Sandbox, a simple formula evaluation,
and relative asset/base-path behavior exercised. `vite.config.ts` deliberately
uses `base: './'` so built asset URLs work under the GitHub Pages repository
path.

## Workspace modules

`App.tsx` still coordinates navigation and shared workspace state while the
incremental split moves independently testable pieces outward. Welcome,
lesson-stage rendering, mission headers, content definitions, mission auditing,
fingerprinting, and evaluation-trace rendering now live in dedicated modules.
New workspace behavior should be added to a focused module rather than growing
the coordinator. Persistence, draft, selection, verification, guided mission,
and dialog state must remain conceptually separate even when orchestrated by the
same component.

## Learn content architecture

The first three chapters remain in `src/learn.ts`; the remaining lesson data is
split by chapter under `src/learn/`. Shared constructors live in
`src/learn/shared.ts`. Keep chapter modules declarative and route all semantic
checks through the existing evaluator.

`prediction.kind: 'statement-choice'` supplies reusable radio-card answers via
`statementChoices: { id, label }[]`. Its `expectedChoice` must identify one of
those cards, and `mustBeCorrect` blocks completion with a generic explanatory
error when the selected interpretation is wrong. `scopeComparison: {
evaluationWorld }` requests a post-check comparison of pointed, model-global,
and frame-valid truth; it must call the normal verifier three times rather than
introducing another evaluator.

Tests for authored Learn data must prove that every editing task starts
incomplete, an intended state passes, and a key distractor fails. Identification
tasks require missing, wrong, and correct-answer checks. Every task also needs a
parseable formula when semantic, exactly three hints, an existing evaluation
world, and unique lesson/task IDs. `createLevelFingerprint` is compared across
Controls and Learn; an exact duplicate is allowed only through an explicit,
pedagogically justified test allowlist.
