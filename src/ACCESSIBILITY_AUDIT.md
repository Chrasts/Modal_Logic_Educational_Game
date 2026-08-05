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

The Vitest UI suite checks landmark/focus behavior, formula-error focus, table synchronization, mobile-section controls, result announcements, trace stepping, and essential keyboard-operable controls.

## Manual WCAG 2.2 AA pass

A final release candidate still needs a human browser pass at keyboard-only navigation, 200% zoom, 320 CSS-pixel width, screen-reader announcements, forced colors, contrast measurement, touch interaction, and both reduced-motion modes. Record browser/OS/assistive-technology versions and issues in the release ticket.

The current automated environment exposed no controllable browser backend, so no visual/manual result is claimed by this document. This is a release verification step, not a reason to weaken the implemented keyboard and semantic markup.
