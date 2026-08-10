# Accessibility audit

## Implemented and automatically checked

- A skip link targets a focusable main landmark.
- Every core model edit is available through ordinary form controls; the synchronized `World | Atoms | Successors` table is an alternative to pointer interaction with the graph.
- Model rows expose valuation editing, evaluation-world selection, and deletion; the inspector exposes keyboard-operable `Connect to…` relation creation.
- Verification, hints, semantic-trace selection, and Previous/Next stepping are buttons or native disclosure controls.
- Parser errors return focus to the formula input and select the reported source position.
- Dialogs receive initial focus, trap Tab/Shift+Tab, close on Escape, and return focus to the prior control.
- Success/failure states use text labels in addition to color. Graph roles use SELECTED, CURRENT WORLD, WITNESS, COUNTEREXAMPLE, DERIVED, CHECKED EDGE, and IRRELEVANT labels.
- Reduced motion follows both the OS preference and a saved in-app preference.
- Mobile workspaces use MODEL/FORMULA/RESULT tabs, a sticky result action, larger controls and graph handles, and a world-inspector bottom-sheet treatment.

The Vitest UI suite checks landmark/focus behavior, formula-error focus, table synchronization, mobile-section controls, result announcements, trace stepping, draft validation, selection deletion, and essential keyboard-operable controls. Playwright additionally exercises focused desktop and 390 px Chromium journeys, including map drag, loose-handle relation creation, Undo, Learn dialogs, progressive hints, and mobile verification reachability.

## Manual WCAG 2.2 AA pass

A final release candidate still needs a human browser pass. Complete the fields
below for each browser/assistive-technology combination; leave the result as
`Not run` until a human tester actually performs it.

### Test environment

| Field | Value |
| --- | --- |
| Browser and version | _Not recorded_ |
| OS and version | _Not recorded_ |
| Screen reader and version | _None / not recorded_ |
| Date | _Not run_ |
| Tester | _Not assigned_ |
| Overall result | **Not run** |
| Issue link(s) | _None_ |

### Release checks

| Check | Result | Notes / issue link |
| --- | --- | --- |
| Keyboard-only navigation and visible focus | Not run | |
| 200% browser zoom | Not run | |
| 320 CSS px viewport | Not run | |
| Screen-reader names, roles, states, and announcements | Not run | |
| Forced-colors mode | Not run | |
| Text and non-text contrast measurement | Not run | |
| Touch targets and touch-only operation | Not run | |
| Reduced-motion OS and in-app settings | Not run | |
| Graph/table information and operation parity | Not run | |

Allowed result values are `Pass`, `Fail`, `Blocked`, and `Not run`. Every
`Fail` or `Blocked` row must include an issue link before release sign-off.

Automated Chromium journeys are recorded separately from this table. They do not constitute a human WCAG review, a screen-reader pass, a 200% zoom inspection, or testing on physical touch/trackpad hardware, so no manual result is claimed here.
