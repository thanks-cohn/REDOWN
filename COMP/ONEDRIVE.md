# Microsoft OneDrive — REDOWN competitor brief

**Category:** first-party Microsoft cloud storage and desktop sync  
**Priority:** P1  
**Status:** Strategy with cited starting points; manually verify product versions and feature availability before implementing claims.

## What the competitor does well
Windows and Microsoft 365 integration, sync, file-on-demand, collaboration and familiar workflows.

## What we should borrow as product principles
Automatic sync clarity, predictable recovery, folder monitoring, conflict presentation.

## Where REDOWN could win
Cross-provider capture and organization from browser, later shared UI desktop engine for large local files.

## Where they can beat us / reality check
Huge default distribution; users may never need a second tool for single-cloud workflows.

## REDOWN API and cold-agent implications
Provider status, conflict history, filesystem watcher, transfer policy, consent scope, cross-provider path map.

## Concrete competitive / QA experiment
Office-worker document path through OneDrive and REDOWN; continuity with Windows local file conventions.

## Rules of engagement
Maintain REDOWN's one-click DONE workflow, user-owned execution model where authorized, no false transfer or replica success, no silent destructive cleanup, auditable provider scopes and error handling, accessible simple mode, desktop expansion via shared experience. Competitor strengths are inspiration; do not copy proprietary assets or obscure needed confirmation.

## Sources / verification starting points
https://www.microsoft.com/microsoft-365/onedrive/online-cloud-storage

## Agent follow-up checklist
- [ ] Confirm competitor's currently shipped behavior with dates and screenshots/primary documentation.
- [ ] Locate REDOWN's corresponding real code, schema, tests and any historic regressions.
- [ ] Mark REDOWN feature IMPLEMENTED, PARTIAL, PLANNED or UNKNOWN.
- [ ] Propose measurable superiority criterion and acceptance test.
- [ ] Expose full workflow via agent-readable safe APIs and diagnostic events.
