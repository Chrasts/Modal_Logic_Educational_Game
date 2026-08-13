# Modal Logic Lab - Interactive Kripke Models

Modal Logic Lab is an interactive modal-logic laboratory and puzzle game
for constructing finite Kripke models, testing formulas, and exploring the
connection between modal axioms and relational properties.

## [Play online](https://chrasts.github.io/Modal_Logic_Educational_Game/)

The browser version is the primary way to play. It requires no installation,
and Model Sandbox drafts and completed missions are saved locally in the browser.
The application opens on a home menu with a one-word **LEARN** button, followed
by a compact progress/next-lesson status, plus **CAMPAIGNS** and **LAB**.
Create, Profile, settings, local data tools, and GitHub remain available in the
secondary More menu. Fullscreen is a direct topbar action rather than a More
menu item. Shared
mission URLs intentionally bypass the menu and launch their validated content.

## What you can do

- Build finite Kripke models visually by adding and moving worlds.
- Assign propositional atoms and draw accessibility relations.
- Evaluate formulas at a selected world or throughout a model.
- Check validity on a finite frame across every possible valuation.
- Compare two formulas at one world, throughout the displayed model, or under
  every valuation on a finite frame, with a distinguishing world and valuation
  when they are not equivalent.
- Work with reflexive, symmetric, transitive, Euclidean, serial, irreflexive,
  and acyclic relations.
- Validate relational properties or enforce supported relational closures.
- Compare modal axioms T, D, B, 4, and 5 with their characteristic frame
  properties on concrete finite frames.
- Inspect counterexample worlds and countervaluations when an objective fails.
- Expand a recursive evaluation tree showing subformulas, worlds, modal
  witnesses, counterexample successors, and vacuous truth.
- See the most actionable nested evaluation diagnostics summarized above the
  tree, without having to expand every subformula first.
- Navigate with a keyboard using a skip link, visible focus indicators, semantic
  landmarks, and live verification-result announcements.
- Enter browser fullscreen from the global toolbar where the Fullscreen API is
  available.
- Keep an anonymous browser-local guest history and export it as a JSON backup.
- Record structurally distinct successful solutions per mission up to finite
  Kripke-model isomorphism, so renaming worlds does not inflate the count.
- Record transparent construction metrics—worlds, explicit relations, true atom
  memberships, and semantic changes from the mission start—without presenting
  them as a proof of mathematical minimality.
- Summarize local practice by mission concept and classify failures into stable
  structural, frame-rule, answer, syntax/model, and finer semantic categories,
  including modal witnesses, box counterexamples, scope, and frame validity.
- Preview the exponential number of valuations required by frame validity and
  stop searches above the documented finite-browser limit before execution.
- Turn the current Model Sandbox into a versioned custom mission, choose which editor
  parts remain unlocked, add size and frame-property constraints, predictions,
  required or forbidden edges and atoms, and an optional edge bonus, then share
  or launch the mission as JSON. Authors can capture a separate starting state
  and a mathematically verified reference solution; importing the mission loads
  only the player start. The author can restore that start or playtest the
  mission immediately in the same locked player workspace used by imports.
- Define repair missions with a maximum semantic-change budget measured against
  the initial model (worlds, explicit edges, and atom memberships).
- Collect authored missions into an ordered, versioned campaign package that
  can be shared as one JSON file and played as a multi-level sequence.
- Generate shareable mission or campaign URLs whose validated JSON payload is
  encoded entirely in the URL fragment and opened directly by the game.

The formula editor accepts `¬`, `∧`, `∨`, `→`, `□`, and `◇`, as well as the text
alternatives `!`, `&`, `|`, `->`, `box`, and `diamond`.

## Ways to play

### Lab and Model Sandbox

Lab is the free experimentation area. Its first active tool, **Model Sandbox**,
uses the same finite Kripke workspace to build and inspect models, compare
formulas, explore frame properties and traces, and evaluate whether a formula
holds at one world, throughout the displayed model, or on the underlying frame
under all valuations. Opening and leaving Lab preserves the existing local
Model Sandbox draft.

### Learn Modal Logic

**Learn Modal Logic** is the single recommended route for new players. It
starts with a replayable **Welcome to Modal Logic** visual introduction, then
the replayable six-lesson **Learn the Controls** workspace section, followed by
the complete 9-chapter, 50-lesson course: **Truth at a World**, **Worlds and
Accessibility**, **Possibility**, **Necessity**, **Box and Diamond**, **Nested
Modalities**, **Local, Global, and Frame Truth**, **Models and Countermodels**,
and **Frame Properties**. Together with the six controls lessons, the available
Learn path contains 56 tasks. The
overview and progress totals are calculated from the same `learnCourse` data
that defines the lessons.

Learn construction tasks use **Check task** after editing the model. Read-only
question tasks keep the question in the mission panel and use **Confirm answer**;
world answers are selected in the graph or synchronized Table view. Successful guided tasks finish
inside that panel without covering or resetting the map. The same header contains
the section/campaign, local progress, title, and a single objective; longer
briefings, concept help, analysis, hints, and reference solutions are available
under **Details & hints** instead of a second persistent strip.

Learn calls each guided unit a **lesson**, Campaigns and Practice call it a
**mission**, and Model Sandbox has no guided progress or mission header. Guided
workspaces render Verification by default and only expose world, valuation, or
accessibility panels that are useful for the current task.

The first workspace visit offers a versioned four-step tour that can be reopened
from **Quick help**, **More**, or **Help & Controls** without resetting the current mission. Quick help is a concise workspace reference and links to full Help. On the model
map, one native non-passive canvas handler owns wheel gestures: a mouse wheel zooms under the pointer, two-finger touchpad scrolling pans
with every X/Y delta the browser supplies, pinch zooms without an app-side gesture lock, and dragging empty space pans. Compact toolbar
controls provide Zoom in/out and Fit model. **Tidy model** deterministically
repositions worlds as one undoable presentation step; Fit changes only the
viewport. React Flow's competing wheel handlers are disabled, controls do not trigger map gestures, and the minimap is a passive overview. New worlds appear near the selected world or viewport centre, avoid
immediate spawn collisions, and can also be created by double-clicking empty
desktop map space. That double-click creates exactly one world and does not zoom.

Reverse directed pairs are normally presented as one bidirectional relation.
Clicking it temporarily expands the two directions for inspection or deletion.
Explicit and rule-derived directions keep distinct filled/open arrowheads, while
floating perimeter endpoints and deterministic route lanes keep nearby relations
separate. A self-loop is shown only as ↻ on its world: a solid badge is explicit
and a dashed badge is derived. The table view always lists the underlying
directed successors, including self-loops.

Each world has four loose connection points. Relation direction is determined
only by the world where a drag starts and the world where it ends; the chosen
side of either world has no semantic meaning. New relations remain drafts until
both endpoints are chosen. Committed world names and explicit ordered pairs are
validated for uniqueness, and deleting a world removes only that world and its
incident relations—no predecessor/successor bridge is invented. Select a world
or explicit relation and press `Delete`/`Backspace`; the complete edit is one
undoable history step.

Frame rules affect the effective relation used by verification. Derived pairs
remain semantically active when hidden, and the interface reports how many are
hidden; a hidden pair needed by the current evaluation trace is temporarily
shown. Frame-property failures list structured witnesses that can be highlighted
on the map without adding the missing relation. **Tidy model** always lays out
the explicit relation and never rewrites semantic data.

Campaigns is a secondary place for **General Challenges** and **Practice
Library**, with a clear link back to Learn for foundations.
Purely structural introductory tasks and Frame Architect missions use construction-only objectives: they
check the required worlds, atoms, relations, frame properties, and evaluation world without showing
an artificial tautological formula. Semantic lessons still show their concise,
read-only formula and only the workspace controls relevant to that lesson.

### Practice Library

The Practice Library is a non-linear secondary area within **Campaigns**. Its existing collections contain 33
missions organized by objective type:

- Local Models & Countermodels
- Global Model Building
- Countervaluations
- Frame Engineering
- Correspondence Lab
- Formula Equivalence Lab

Practice missions can restrict worlds, relations, valuations, editable inputs, and frame
properties. Some include optional bonus constraints revealed only after the
primary objective is completed. The game provides no solution hints beforehand.
Selected missions also require the player to identify a relational property;
an incorrect required answer prevents completion even when the accompanying
semantic check succeeds.
Countervaluation-choice missions present complete atom assignments per world
and require the player to select the assignment that distinguishes or refutes
the configured formula.
Candidate-model missions present several small pointed Kripke models side by
side, including their valuations and explicit relations, and require a semantic
choice rather than an edit to the active workspace.

### Local learning record

The browser keeps an anonymous guest profile with recent verification attempts,
concept and failure summaries, and distinct successful constructions. Players
can back up the full profile as JSON or export attempt-level results as CSV for
an educator or personal study review. Nothing is uploaded automatically.

### General Challenges

General Challenges are longer guided mission arcs with their own sequencing, hints,
debriefs, and learning objectives. The current built-in campaigns are:

- **Countermodel Hunter** — construct small Kripke models that refute invalid
  modal claims.
- **Frame Architect** — design accessibility relations with selected structural
  properties.
- **Formula Laboratory** — compare modal formulas and build distinguishing
  models.

### Reference and Help

Primary navigation contains **Home**, **Learn**, **Campaigns**, and **Lab**.
**Modal Logic Reference** and **Help & Controls** are grouped in **More**:
Reference is a compact mathematical lookup, while Help covers workspace controls,
objectives, results, and local data. Welcome, Learn the Controls, and the workspace
tour remain replayable from Help without duplicating the Learn course.

Create keeps authored custom missions and custom campaign packages separate
from all built-in content.

### Workspace shortcuts

- Select an explicit edge, then press `Delete` or `Backspace` to remove it.
- Click a collapsed two-way relation to inspect its directions; press `Escape`
  or click empty space to collapse it again.
- Press `Escape` to clear the current world or edge selection.
- Use `Ctrl+Z` to undo and `Ctrl+Y` or `Ctrl+Shift+Z` to redo model edits.
  The short tutorial enables undo and redo only in its final combined step.

### Settings

Browser-local settings control workspace density, minimap visibility, derived
edge visibility, reduced interface motion, and optional sound effects. Sound is
off by default, uses only short local Web Audio cues, and never includes music.
At desktop widths, both workspace side panels have keyboard-operable drag
separators; their bounded widths persist locally and Reset interface preferences
restores the defaults. Verification shows a concise, unmistakable result first;
truth-by-world evidence and the semantic debugger remain under **Semantic details**.
Fullscreen is available directly
in the global toolbar when supported. Settings affect presentation only and
never change formulas, semantics, or mission constraints.

Public use currently targets desktop and laptop browsers. A small viewport with a
coarse primary pointer receives a **Desktop required** notice; the retained mobile
workspace code is not presented as a supported phone experience yet.

## Modal semantics

A finite Kripke frame is `F = ⟨W,R⟩`. A model is `M = ⟨W,R,ν⟩`, where
`ν: Prop → ℘(W)` is a valuation. The game uses the standard satisfaction
notation `M,w ⊨ φ`.

- `M,w ⊨ □φ` iff every `v` with `wRv` satisfies `φ`.
- `M,w ⊨ ◇φ` iff some `v` with `wRv` satisfies `φ`.
- `M ⊨ φ` checks every world under the current valuation.
- `F ⊨ φ` checks every world under every valuation.

Frame validity is computed exhaustively for the finite frame currently shown.
A correspondence result verifies agreement on that particular frame; it is not
by itself a general mathematical proof of a characteristic-class theorem.
The supported language is basic unimodal propositional logic. The application
does not solve infinite frames or claim absolute minimality for reduced models.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Run unit/integration tests with `npm test`, the production build with
`npm run build`, and Chromium workspace journeys with `npm run test:e2e` after
installing the Playwright browser once via `npx playwright install chromium`.

Vite will print the local address. If Windows PowerShell blocks `npm.ps1`, use
`npm.cmd run dev` instead.

## Documentation

- [Campaign guide](docs/CAMPAIGNS.md) — mission descriptions without solutions
- [Campaign solutions](docs/SOLUTIONS.md) — spoilers and reference constructions
- [Mathematical conventions](docs/MATHEMATICAL_NOTES.md) — semantics, notation, correspondences, and scope
- [Development guide](docs/DEVELOPMENT.md) — architecture, tests, and technical scope
- [Learn course architecture](docs/LEARN_COURSE.md) — data-driven guided-course structure and local progress
- [For educators](docs/FOR_EDUCATORS.md) — learning goals, misconceptions, suggested use, and limits
- [Pilot protocol](docs/PILOT_PROTOCOL.md) — cohorts, pre/post testing, observation, and retention
- [Privacy and analytics](docs/PRIVACY.md) — local storage, exports, hosting, cookies, and analytics policy
- [Accessibility audit](docs/ACCESSIBILITY_AUDIT.md) — implemented access paths and the manual release checklist
- [Countermodel Hunter](docs/COUNTERMODEL_HUNTER.md) — first guided campaign and its semantic strategies
- [Frame Architect](docs/FRAME_ARCHITECT.md) — guided campaign on relational frame properties
- [Formula Laboratory](docs/FORMULA_LABORATORY.md) — guided campaign on semantic formula comparison

## Technology

The application is built with React, TypeScript, Vite, and React Flow. The modal
logic engine is independent of the UI and is covered together with the primary
user interactions by an automated Vitest test suite.

## Author

Created and maintained by [Chrasts](https://github.com/Chrasts).

Copyright © 2026 Štěpán Chrast.

Released under the [MIT License](LICENSE).
