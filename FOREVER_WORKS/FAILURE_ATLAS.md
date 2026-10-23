# Failure atlas

This is a projection and navigation aid. The existing gateway remains the issue lifecycle authority. Its 66 records include historical reports, release gates and baseline assertions; they are not 66 independently reproduced active bugs. Preserve recordedStatus versus current assessment and stale-review findings.

## Fresh baseline failures

Three failures outside the seven recorded names were observed before ingestion:

- `tests/explorer-diagnostic-fixtures.test.mjs` — current architecture references resolve and imported CLI operates outside checkout without executing arbitrary input (`AssertionError`).
- `tests/issue-inventory.test.mjs` — explicit labels are recorded as partly addressed while the omitted-item report stays open (`AssertionError`).
- `tests/options-debug-display.test.mjs` — successful provisioning refreshes destination editors and inventory before reporting ready (`TypeError`).

Details: [verification/baseline-failure-details.log](verification/baseline-failure-details.log). The first failure reports stale current Explorer source anchors; the issue-inventory failure concerns a stale assessment, and provisioning fixture failure needs its own harness/source investigation. These are failure observations, not three verified customer defects or established causal fixes.

Seven recorded failures remain under agent/diagnostics/regression-baseline.json. Full retained results: verification/baseline-reliability.json. Explorer smoke also fails at the architecture assertion; see explorer-smoke.log. Do not call the smoke suite green.

## Investigation routes

| Symptom | Start and next distinction | Proof still needed |
|---|---|---|
| Preview/Download work, Copy/Move/Paste HTTP404 | docs/explorer/HANDOFF.md; options.js pasteExplorer → background.js transferExplorerObjects → destination Worker transferBatch → source /object; compare exact-key/account/bucket/Worker identities | Installed/deployed version and authorized provider binding; one successful path does not prove another |
| Both menus say Files, destination missing | buildMenus and saved profiles → label precedence, inclusion flags, sanitized IDs, serialized rebuild; inspect BUG-002/DBG-002 and current issue assessment separately | Current installed menu reproduction; label fix does not close omitted item |
| Login then 403 | cloudflare-api.js authenticationRejected/auth/request; cloudflare-auth.js current allowed scopes | Ordinary permission denial versus explicit token rejection; actual client refresh grant; do not add rejected offline_access |
| Local file upload fails or may overwrite concurrently | options.js inspectLocalUploadObject/uploadLocalFiles | Absent-check/PUT atomicity; uncertain write versus safe retry; fixture size check is not content hash |
| Keep both directory merges | BUG-019 and bugs/fixes/BUG-019-directory-keep-both-attempt-01.md; folderTargets and conflict identity | Existing destination hashes and installed acceptance; preserve source and sibling directory identity |
| Public URL shown but unreachable | public-addresses.js; cfPublicAddresses versus confirmed cfEnablePublicAccess | Configured versus enabled versus independently accessible object; no automatic public-access mutation |

## Existing issue snapshot

| ID | Recorded status | Current evidence/assessment |
|---|---|---|
| BUG-019 | critical owner data-safety report; source-confirmed folder merging and lost directory retry identity corrected. Actual installed byte overwrite/recovery remains unverified. | unknown / needs-revalidation |
| CODE-UPLOAD-CONCURRENT-CREATE | Source review; not a live failure | unknown / needs-revalidation |
| GATE-installed-workflow-matrix | blocked | unknown / recorded-only |
| GATE-live-worker-object-truth | blocked | unknown / recorded-only |
| GATE-local-upload-conditional-races | not run | unknown / recorded-only |
| GATE-real-expiry-and-soak | blocked | unknown / recorded-only |
| GATE-remote-write-idempotency | not run | unknown / recorded-only |
| GATE-upload-ambiguous-replay | passed | unknown / recorded-only |
| CODE-WINDOWS-SYNTAX | Source review; not a live failure | open / source-implemented |
| DBG-001 | open | unknown / recorded-only |
| DBG-003 | open | unknown / recorded-only |
| EXPLORER-COPY-404-2026-10 | open | open / reported |
| GATE-accessibility-workflow-audit | not run | unknown / recorded-only |
| GATE-auth-generation-and-read-retry | passed | unknown / recorded-only |
| GATE-durable-transfer-recovery | failed | unknown / recorded-only |
| GATE-exact-artifact-installation | blocked | unknown / recorded-only |
| GATE-full-runtime-debug-surface | failed | unknown / recorded-only |
| GATE-full-suite | failed | unknown / recorded-only |
| GATE-license-consistency | failed | unknown / recorded-only |
| GATE-malformed-listing | passed | unknown / recorded-only |
| GATE-privacy-permissions-current-policy | not run | unknown / recorded-only |
| GATE-progressive-search-local | passed | unknown / recorded-only |
| GATE-store-submission | explicitly out of scope | unknown / recorded-only |
| REPORT-9d785a223e76 | Open; user-reported, source inspected, not reproduced against installed Chrome settings. **Priority: P1 menu reliability.** No application code changed in this investigation. | unknown / needs-revalidation |
| DBG-002 | open | unknown / recorded-only |
| GATE-audit-package-integrity | passed | unknown / recorded-only |
| GATE-local-runtime-contract | passed | unknown / recorded-only |
| GATE-modest-windows-performance | not run | unknown / recorded-only |
| GATE-search-durable-resume-and-abort | failed | unknown / recorded-only |
| REPORT-06ffddcefe46 | Unclassified report or follow-up | unknown / needs-revalidation |
| TEST-1cf603c204c1 | Known baseline failure | unknown / recorded-only |
| TEST-4b8f255aa983 | Known baseline failure | unknown / recorded-only |
| TEST-52dda00bf641 | Known baseline failure | unknown / recorded-only |
| TEST-603387dda5ca | Known baseline failure | unknown / recorded-only |
| TEST-73cc7f501bd6 | Known baseline failure | unknown / recorded-only |
| TEST-e02a16f64fa4 | Known baseline failure | unknown / recorded-only |
| TEST-fdf37692be95 | Known baseline failure | unknown / recorded-only |
| BUG-001 | Open · user-reported behavior / usability defect | unknown / needs-triage |
| BUG-002 | Open · interaction requirement | unknown / needs-triage |
| BUG-003 | CSS fix committed (2026-10-10); awaiting visual Chrome verification at 1366×768 and deeper nested paths | unknown / needs-triage |
| BUG-004 | Open · user-reported behavior with a confirmed full-render code path | unknown / needs-triage |
| BUG-005 | Open · source-confirmed editor limitation / user-reported requirement | unknown / needs-triage |
| BUG-006 | Implemented on default branch (2026-10-10); awaiting installed-Chrome verification, especially large R2 cursor results and keyboard selection | unknown / needs-triage |
| BUG-007 | Open · user-reported broken feature / suspect implementation identified; exact rendering failure not yet reproduced | unknown / needs-triage |
| BUG-008 | Fix implemented on default branch (2026-10-10), pending Chrome extension end-to-end verification; very large folders and unavailable files need testing | unknown / needs-triage |
| BUG-009 | Open · recurring user-reported authentication failure / refresh-token error path confirmed | unknown / needs-triage |
| BUG-010 | Fix implemented on default branch (2026-10-10), pending visual and interaction testing | unknown / needs-triage |
| BUG-011 | Open · user-reported site-specific compatibility; root cause unverified | unknown / needs-triage |
| BUG-012 | Open · screenshot-supported user report; exact cause not yet reproduced | unknown / needs-triage |
| BUG-013 | Open · screenshot-supported user report; separate from right-click nested menu BUG-012 | unknown / needs-triage |
| BUG-014 | Open · user-reported regression (October 10, 2026); runtime mechanism not yet verified | unknown / needs-triage |
| BUG-015 | Open · requested capability (October 10, 2026); bucket-by-bucket eligibility unknown | unknown / needs-triage |
| BUG-016 | Open · user-reported UX/state regression (October 10, 2026); exact triggering handlers still to be traced | unknown / needs-triage |
| BUG-017 | Open · user-reported usability/design defect · recorded October 21, 2026 | unknown / needs-triage |
| BUG-018 | source/DOM-confirmed clipboard, stale menu and transport-observability defects corrected; installed transfer outcome remains open. | unknown / needs-triage |
| BUG-020 | source-confirmed while building optional popup dropdown levels; additive exact-path support and pre-write compatibility guard implemented. Installed delivery/Repair acceptance remains pending. | unknown / needs-triage |
| REPORT-0591c3903a25 | Source mitigation committed to `main`; Chrome end-to-end verification pending. | unknown / needs-triage |
| REPORT-122b1191cab4 | Unclassified report or follow-up | unknown / needs-triage |
| REPORT-1244c9523c92 | Fixed in source (`538006a`), regression tests added (`2a5e061`); **human Chrome testing pending**. Automated tests have not been run in this session because the checkout could not be retrieved from GitHub in the execution environment. | unknown / needs-triage |
| REPORT-16959653a7a9 | Unclassified report or follow-up | unknown / needs-triage |
| REPORT-3cfd32b6fe47 | Source changes `79c90c4` and new regression tests `74896f4` committed; automated test execution and installed Chrome testing **pending**. | unknown / needs-triage |
| REPORT-5979edb56553 | Not reproduced conclusively; preserve for investigation if reported again. No configuration or code changes made for this report. | unknown / needs-triage |
| REPORT-93953e5a24cf | Implementation committed `c172731` with focused test `0f88e43`; automated and installed-Chrome verification pending. | unknown / needs-triage |
| REPORT-def0921e87ea | Unclassified report or follow-up | unknown / needs-triage |
| REPORT-e0e2ea2abe27 | Source implementation committed (`7c1b0d6`, `3ac4496`, `376d933`); regression tests added (`b6f2cda`); **automated test execution and human Chrome testing pending**. | unknown / needs-triage |
| REPORT-e37f66f98fed | Unclassified report or follow-up | unknown / needs-triage |

Full original fields and next actions: [verification/issues.json](verification/issues.json). Source issue JSON is also preserved in canonical evidence records; do not edit it there to close an incident. Re-query the gateway and intentionally rebuild the snapshot after source review.
