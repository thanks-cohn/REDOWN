# rclone — REDOWN competitor brief

**Category:** open-source multi-cloud CLI and locally hosted GUI  
**Priority:** P0  
**Status:** Strategy with cited starting points; manually verify product versions and feature availability before implementing claims.

## What the competitor does well
Rich provider coverage; mature copy/sync/move/mount, integrity checks and resilient transfers; native RC interface plus bundled local web GUI.

## What we should borrow as product principles
Deterministic jobs, hashes, resumability, capability matrix, remote control API, transparent error logs.

## Where REDOWN could win
One-click browser right-click capture/save; novice setup; tactile but truthful confirmations; cross-cloud file presence as one understandable object.

## Where they can beat us / reality check
High: technical users can get broad functionality for free. Never claim rclone is CLI-only.

## REDOWN API and cold-agent implications
Provider capabilities; /jobs create/status/cancel/retry; /objects/check; /providers/test; content hash provenance; remote executor modes.

## Concrete competitive / QA experiment
Compare time-to-first-verified-cloud-job with new users; interrupt and resume transfers; reconcile identical objects.

## Rules of engagement
Maintain REDOWN's one-click DONE workflow, user-owned execution model where authorized, no false transfer or replica success, no silent destructive cleanup, auditable provider scopes and error handling, accessible simple mode, desktop expansion via shared experience. Competitor strengths are inspiration; do not copy proprietary assets or obscure needed confirmation.

## Sources / verification starting points
https://rclone.org/ ; https://rclone.org/gui/

## Agent follow-up checklist
- [ ] Confirm competitor's currently shipped behavior with dates and screenshots/primary documentation.
- [ ] Locate REDOWN's corresponding real code, schema, tests and any historic regressions.
- [ ] Mark REDOWN feature IMPLEMENTED, PARTIAL, PLANNED or UNKNOWN.
- [ ] Propose measurable superiority criterion and acceptance test.
- [ ] Expose full workflow via agent-readable safe APIs and diagnostic events.
