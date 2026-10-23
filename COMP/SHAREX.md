# ShareX — REDOWN competitor brief

**Category:** Windows desktop screen-capture and automation utility  
**Priority:** P0  
**Status:** Strategy with cited starting points; manually verify product versions and feature availability before implementing claims.

## What the competitor does well
Advanced screenshot and screen recording, annotations, hotkeys, custom upload destinations, automated after-capture workflows.

## What we should borrow as product principles
Capture hotkeys, editor/annotations, destination presets, copy-result actions, composable after-capture steps.

## Where REDOWN could win
Browser-native no desktop install for tab captures; one capture can target several selected providers with individually verified results; intentionally simple onboarding.

## Where they can beat us / reality check
High for Windows power users; REDOWN should not claim first screenshot-to-cloud.

## REDOWN API and cold-agent implications
Capture session, artifacts, MIME/type, source, recording start/stop, destination fanout, post-capture actions, receipt per destination.

## Concrete competitive / QA experiment
Observe unfamiliar users complete screenshot-to-two-clouds; count settings screens and mistakes; test keyboard-only.

## Rules of engagement
Maintain REDOWN's one-click DONE workflow, user-owned execution model where authorized, no false transfer or replica success, no silent destructive cleanup, auditable provider scopes and error handling, accessible simple mode, desktop expansion via shared experience. Competitor strengths are inspiration; do not copy proprietary assets or obscure needed confirmation.

## Sources / verification starting points
https://getsharex.com/ ; https://github.com/ShareX/ShareX

## Agent follow-up checklist
- [ ] Confirm competitor's currently shipped behavior with dates and screenshots/primary documentation.
- [ ] Locate REDOWN's corresponding real code, schema, tests and any historic regressions.
- [ ] Mark REDOWN feature IMPLEMENTED, PARTIAL, PLANNED or UNKNOWN.
- [ ] Propose measurable superiority criterion and acceptance test.
- [ ] Expose full workflow via agent-readable safe APIs and diagnostic events.
