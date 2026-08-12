# Accessibility audit

## Implemented and automatically checked

- A skip link targets a focusable main landmark.
- Every core model edit is available through ordinary form controls; the synchronized `World | Atoms | Accessible worlds` table is an alternative to pointer interaction with the graph. World-choice questions expose a `Choose world` action in that table.
- Model rows expose valuation editing, evaluation-world selection, and deletion; the inspector exposes keyboard-operable `Connect to…` relation creation.
- Verification presents an atomic text-and-icon success, failure, or error live region. Deep semantic evidence and trace controls remain in a native disclosure collapsed by default.
- Parser errors return focus to the formula input and select the reported source position.
- Dialogs receive initial focus, trap Tab/Shift+Tab, close on Escape, and return focus to the prior control.
- Success/failure states use text labels in addition to color. Graph roles use SELECTED, EVALUATION WORLD, WITNESS, COUNTEREXAMPLE, EXPLICIT/DERIVED RELATION, CHECKED, and IRRELEVANT labels.
- Workspace Quick help is a short five-part dialog with keyboard guidance, a full-Help link, and a workspace-tour replay action; it does not duplicate the mathematical Reference.
- Desktop split-pane separators are focusable, expose vertical separator/value semantics, support ArrowLeft/ArrowRight (and larger Shift steps), and disappear with their collapsed pane.
- Reduced motion follows both the OS preference and a saved in-app preference.
- Phone-class public use (small viewport plus coarse primary pointer) receives a clear **Desktop required** notice. Responsive workspace and author-preview code remains for future development but is not currently a supported mobile product.

The Vitest UI suite checks landmark/focus behavior, formula-error focus, table synchronization, result announcements/disclosure, resize separators and allocation, mobile guarding, trace stepping, draft validation, selection deletion, and essential keyboard-operable controls. Playwright additionally exercises focused desktop and phone-class Chromium journeys, including map drag, loose-handle relation creation, Undo, Learn dialogs, progressive hints, persisted resizing, support navigation, and the unsupported notice.

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
| Physical Win11 / Edge mouse-wheel, precision-touchpad and pinch gestures | Not run | Requires real hardware; synthetic Playwright coverage is not a physical-device result. |

Allowed result values are `Pass`, `Fail`, `Blocked`, and `Not run`. Every
`Fail` or `Blocked` row must include an issue link before release sign-off.

Automated Chromium journeys are recorded separately from this table. They do not constitute a human WCAG review, a screen-reader pass, a 200% zoom inspection, or testing on physical touch/trackpad hardware, so no manual result is claimed here.
