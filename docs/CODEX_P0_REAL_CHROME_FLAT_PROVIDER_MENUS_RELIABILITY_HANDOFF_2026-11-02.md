# CODEX READ-ONLY FORENSIC AUDIT: REDOWN right-click menus

**CURRENT OWNER DIRECTIVE, November 2, 2026: FULL AUDIT ONLY. NO IMPLEMENTATION OR CHANGES.**

**SUPERSEDES AND REVOKES** the previous version of this document, which incorrectly directed an agent to repair, implement, commit, push and test live changes. ALL such directions are CANCELLED. The historical file name includes the word REPAIR; the present contents supersede that name and are strictly AUDIT ONLY. A link to this file merely opens instructions for reading. It does not execute them.

## 0. Absolute rules: do not change anything

The owner requests a detailed technical forensic audit, not a solution, patch, prototype, action plan, or implementation.

1. Do NOT edit, create, delete, rename, generate or reformat ANY source, tests, fixtures, documents, archives, reports, lock files, configuration or scripts in the repository.
2. Do NOT commit, push, merge, revert, rebase, reset, checkout a different branch, cherry-pick, create branches, create PRs, move tags, update the default branch, or manipulate Git history. Do NOT modify main or the feature branch.
3. Do NOT install/update dependencies, compile with outputs in the tree, write test snapshots, regenerate diagnostics, touch package-lock, run code formatters, apply menu changes, or let a tool silently modify a repo file.
4. Do NOT connect accounts, request OAuth/permissions, upload files, perform live saves, refresh/change cloud data, modify Chrome's user's persistent profile, or deploy to any cloud.
5. Review a test command's side effects before running it. If it may modify state and an isolated non-writing execution cannot be guaranteed, mark it NOT RUN and explain. Git read-only commands and static source/previous result analysis are preferred.
6. Do not write an audit-report file in the repo. Deliver the entire detailed audit in the final conversation only, with source links and evidence tables. Do not output code changes or patch diffs.
7. Record branch, commit SHA and worktree status before/after with read-only observations; if the tree is already dirty, leave it dirty. No cleanup, stashing or resets.
8. If other repository documents require implementation or pushing, THIS document's explicit non-mutation directive overrides them for this task. Read those documents as historical source material only.
9. Audit what is built and what is verified, not what one hopes to build. Do not claim browser acceptance from simulations.

**Stop after delivering the analysis.** Any future repair requires a new, explicit owner authorization.

## 1. Repository, baseline, and exact question

Repo: https://github.com/thanks-cohn/REDOWN

Feature branch under investigation: codex/flat-provider-native-menus

Feature application commit: d692a0da878268d504f1ab9e5a9e130919f65043

Its immediate parent: 34b5f73de064172da915832d51c235bb110d7914

Current main reverted feature via: 455911af99ced82058588e57efd406236ae16192. Audit whether its tree really matches 34b5f73. Do not change main.

Protected checkpoint: checkpoint/2026-11-01-amoebe-before-flat-provider-menus; annotated tag SHA 049542becd50a1e04a0ebfe2ecb6fbfa764d8f80. Do not modify.

Owner used Windows Command Prompt on the feature branch and confirmed git rev-parse --short HEAD = d692a0d. The owner previously tested the feature but noticed NO obvious difference in the native context menu. The exact screenshot, profile, extension ID, loaded path, target webpage/context, provider state and service-worker error state have not been supplied. The owner's observation is a report; the precise reason is UNKNOWN. Do not invent a user reproduction, assume it was Chrome cache, or call a suspected bug proven.

**Main audit question:** What did d692a0d really change, where does Chrome's real native menu come from, why might it appear unchanged, what does the evidence prove, and what do existing tests fail to verify? Differentiate baseline behavior, simulated proof, Chrome API callbacks, visible UI, click dispatch, and actual provider save outcomes.

## 2. The product requirement: compare against it, DO NOT IMPLEMENT IT

At REDOWN's first submenu level, Google Drive, Dropbox and OneDrive should each be EXACTLY ONE directly clickable leaf. No arrows, second-level provider submenus, nested Save/Connect children, duplicate provider rows, or provider-owned nested folder hierarchy.

Only Cloudflare is permitted to contain nested descendants. Its existing V3 Simple / Nested Narrow / Nested Depth (internally Level) semantics are authoritative. If Cloudflare has just one eligible authorized destination, it may be a leaf according to the existing V3 contract; if it has multiple, its destination structure can expand. Addition of other providers must not itself change the shape or identity of Cloudflare destinations.

Expected conceptual shape with a multilevel Cloudflare tree:

~~~text
REDOWN
  Cloudflare >      [Cloudflare V3 destinations ONLY]
  Google Drive      [one directly actionable leaf]
  Dropbox           [one directly actionable leaf]
  OneDrive          [one directly actionable leaf]
  [existing separator and existing approved Home / Manage controls]
~~~

Connected should route the respective provider's existing authorized save; disconnected/expired should route its existing connection/reconnection behavior; connecting/busy should keep the same single row, potentially disabled. None of this permits changing OAuth/transfer logic in this audit.

Compare current code and historical product documentation regarding Home last, Go Home, Manage destinations, separators and setup actions. Do not quietly assume conflicting layouts are equivalent. Classify which contract is current and what is unknown.

## 3. FULL end-to-end architecture trace with source evidence

Inspect ACTUAL source at commit d692a0d and source at its immediate parent. For every key point, include FILE + FUNCTION + LINE RANGE, trigger, input/state, output, failure behavior, and authority. No generic summaries without code anchors.

### A. Manifest, Chrome load and background survival
- extension/manifest.json: actual MV3 service worker name, extension version and ID/key behavior, permissions, contexts, extension startup.
- extension/service-worker.js: exact importScripts behavior and failure fallback; possibility of the toolbar opening while native menu initialization is absent.
- extension/background.js import order, entry-bootstrap.js and boot.js: what registers before or after major provider imports; core parse/evaluation failures; toolbar recovery vs independent menu readiness; exact registration points and lifecycle hooks.
- Inspect all imported modules prior to contextMenus listeners. Determine if the listener can fail to register while other UI appears healthy.
- Trace onInstalled, onStartup, worker activation/re-activation and whether menus are reconciled after MV3 worker restart. Note Chrome native menu lifetime assumptions and limits.
- Identify competing registration/listener code, if any; enumerate actual contextMenus.create, update, remove, removeAll, and onClicked locations and who owns them.

### B. Shared menu writer and persistence
- extension/background.js: menuApplicationKey, rebuildMenus, reconcileMenus, acknowledgeMenu, ensureMenuAccess, buildMenus, addMenuControls, and any relevant dependencies.
- Walk actual code path: persisted V3/CURRENT configuration -> Cloudflare projection -> sibling provider declarations -> parent-child plan -> registration operations -> callbacks -> local acknowledgement -> visible native menu.
- Analyze rightClickNativeIds, rightClickMenuStatus, nativeMenuPlan, application revisions, rightClickV3Presentation, rightClickV3LevelScopes, rightClickV3Inventory, rightClickActivatedBuckets, right-click.json and indexed CURRENT state as actually used.
- Analyze callback lastError lifetime, update/create fallback, removal failure, timeouts, partial menu preservation, order changes, stale/unknown IDs, failed parent create, missing child removal, repeated Apply, storage unavailable and interrupted restart.
- Explain exact distinction between state='registered', an API-acknowledged plan, and actual screen-visible rendered rows. No unsupported native inventory claims.
- Assess whether in-memory early-return (nativeMenuPlan matches plan) could matter after native state changes, without asserting it happened.
- Identify composition failures silently returning original descriptions; check whether failures propagate or are stored and can cause a missing row.
- Document registered context types and expected browser context-dependent menu visibility.

### C. Provider fragments and one-click dispatch
- extension/google-drive-menu.js, dropbox-menu.js, onedrive-menu.js: IDs, allowed fragments, parent root, compose/composeSibling semantics, ordering, validation, revision and obsolete functions. Determine if source strictly prevents all non-Cloudflare nested children and when it may not.
- extension/background.js's single contextMenus.onClicked listener: exact routing precedence, ownership, stale IDs, setup versus remote save fallback and possible collisions.
- extension/google-drive-provider.js: current state -> connected/verified-folder save vs connect; pre-existing transfer-tab constraints, page context source selection, stale child behavior.
- extension/dropbox-provider.js: direct dispatch, request for source-host permission before saved provider-state read, busy/connecting/identity/queued auth, potential prompts and silent outcomes. This is source behavior to audit, not permission to change it.
- extension/onedrive-provider.js: direct dispatch, connecting vs connect vs forced ready/root revalidation, upload and stale child ID behavior. Discuss known upload-host limitations.
- Retired known IDs to trace specifically: provider:google-drive:connect; provider:google-drive:save-redown; provider:dropbox:connect; provider:onedrive:connect; provider:onedrive:save-root.
- Confirm which adapters receive actual clicked menuItemId and which states disable the row.
- Audit privacy boundary at code level: source page/link/media URLs and provenance are REDOWN-owned and should not be sent to Google/Dropbox/Microsoft storage API calls; providers should receive only actual bytes and necessary filename/extension/destination metadata. Do not initiate requests.

### D. Cloudflare isolation
- extension/right-click-v3.js, right-click-current.js, nested-locations.js, destination-config.js, background.js and related actual configuration. Examine Cloudflare Simple, Nested Narrow and Depth(=Level), multiple buckets/destinations, exact prefix resolution, default redown root and no-R2 setup handling.
- Establish whether the flat menu feature edited Cloudflare engine/registrar/dispatcher. If not, distinguish 'unchanged Cloudflare' from 'proved Cloudflare working.'
- Check interactions where new top-level siblings could affect Cloudflare ordering, menu depth/capacity, root/child parentage or click routing despite leaving the engine's main source file unchanged.

## 4. Exact change inventory and branch comparison

Produce a complete changed-file table for commit d692a0d versus 34b5f73, grouping each file by:
- native menu generation/ordering;
- provider click dispatch;
- deletion of obsolete IDs/upgrade state;
- tests and altered assertions;
- documentation/evidence;
- unrelated additions or non-changes.

Explain whether reverting d692a0d from main returned source contents to the previous tree, and why the feature branch still contains the candidate. Documentation-only later commits on the feature branch must NOT be mistaken for changes to feature behavior.

Distinguish visible differences for a user looking only at Cloudflare versus a user looking at Google, Dropbox, OneDrive. Assess dual installed copies, Store vs unpacked extensions, current profile, extension file path and extension ID only as hypotheses unless grounded.

## 5. Evidence and test-quality audit

Examine tests/flat-provider-menus.test.mjs, tests/helpers/background-worker.mjs, existing provider/V3/BOOT/native tests, package.json scripts and evidence archives.

Make a test-to-claim mapping:
- every meaningful assertion and what it directly establishes;
- whether Map-based mocks truly match Chrome callback semantics, especially runtime.lastError timing, contextMenus.update/create/remove, ordering and parent constraints;
- which tests only check synthetic menu-plan IDs;
- which tests actually start an installed MV3 extension;
- which tests verify a human-visible native Chrome submenu arrow;
- which tests click native menu items with real events;
- which tests verify OAuth and remote upload receipts rather than mocked actions;
- what tests are absent or insufficient, and why this prevents confidence.

**Known specific harness issue to VERIFY, not fix:** scripts/installed-chrome.mjs looks for a service_worker Target URL ending with /background.js while the manifest declares /service-worker.js. It may falsely report missing worker once execution reaches that assertion. The previously recorded installed Chrome attempt did not reach it.

**Recorded browser attempt:** Linux Chrome 154, blocked because the administrator disabled loading unpacked extensions. Report says zero installed-browser assertions passed. Do not interpret as real menu failure or success, and do not attempt a policy bypass. Inspect scripts/installed-chrome.mjs to determine whether it even has any native menu UI/gesture assertions; it appeared limited to extension options, worker presence, diagnostics and local persistence.

No local or installed test command may write the repo or a real user profile. If test effects cannot be guaranteed harmless, omit running them and analyze the existing result files instead.

## 6. The 97 failing tests and relevance to this feature

Audit the exact result data in docs/verification/flat-provider-menus/results.json and supporting logs, without inventing missing test output.

Documented baseline before feature: 980 total, 883 passed, 97 failed.
Documented candidate d692a0d: 985 total, 888 passed, 97 failed.
Newly failing names: 0; 5 extra tests passed.
Targeted provider set: 114 total, 112 pass, 2 fail.
Broader provider/V3/BOOT selection: 196 total, 180 pass, 16 fail.
Reliability check: failed; syntax passed; architecture gate failed.

Categorize all 97 failing *test names* by actual subsystem with totals and no double counting. For tests related to menu registration/startup/projections/provider click routing, explain exactly what those failures assert, whether the failure predated d692a0d, what the historical baseline proves, and what remains unproven. A failing test name is NOT necessarily a validated defect; a passing mock is NOT browser proof. Do not change baselines or skip any failing tests to manufacture green status.

Do not imply all 97 originated from the latest feature; the report says they did not. Do not imply the new feature works in Chrome merely because none were newly introduced.

## 7. Hypothesis investigation matrix: evidence, not guesses

Assess each question explicitly, assigning CONFIRMED / REFUTED / POSSIBLE BUT UNVERIFIED / UNKNOWN; include source/log/screenshot support, counter-evidence and what one additional observation would distinguish it.

H1: User primarily inspected Cloudflare; Cloudflare was intentionally not visually changed.
H2: Different unpacked path/Chrome profile/extension ID or duplicate installation led to testing old code.
H3: Worker core import failed after toolbar fallback registered but before native menus registered.
H4: Menu reconciliation was stuck applying, failed, or superseded; desired vs applied generations differ.
H5: Historical child IDs survived an upgrade because cache, callback deletion or Chrome state diverged.
H6: Provider composition/ordering validation silently left off a row.
H7: Context type, enabled/connecting state or browser-specific UI affected row visibility.
H8: Leaf was correctly present but provider click routing, permissions, login state or transfer tab failed, making it seem ineffective.
H9: Mock native Map semantics hid actual Chrome registration/order/worker behavior.
H10: Cloudflare V3 interactions or controls made change hard to notice.
H11: Main/feature confusion, a previous revert or differing test versions explained perceived mismatch.
H12: Additional discovered causes not covered above.

Avoid claiming a specific root cause when no real Chrome traces exist. A confidence ranking is welcome but does not substitute for proof.

## 8. Verification coverage MATRIX — distinct evidence levels

For each case report: SOURCE-VERIFIED / MOCK-VERIFIED / REAL-CHROME-VERIFIED / LIVE-PROVIDER-VERIFIED / BLOCKED / NOT RUN / UNKNOWN, with explicit evidence:
- fresh clean browser profile with disconnected cloud providers;
- upgraded existing profile with obsolete submenu children;
- verified connected provider, expired state, reconnect, busy/connecting;
- all five context types: image, link, page, video, audio;
- real top-level submenu arrows and whether provider rows are leaves;
- Cloudflare Simple, Narrow and Depth with single or multiple destinations;
- exact ordering and Home/Manage controls;
- worker suspend/restart, Chrome restart, reload, installed extension identity;
- callback errors, missing parents, duplicate IDs, stale ID cache and interrupted native registration;
- actual click -> provider adapter -> authenticated action -> remote provider receipt, keeping each stage separate.

Do not perform state-changing browser actions for this audit. If a real-browser step requires such action, mark NOT RUN/BLOCKED and instead provide short **manual read-only screenshot/console evidence instructions** for the owner to do later. Never pretend real-browser proof already exists.

## 9. Required final deliverable: LONG, rigorous forensic audit IN CHAT

Do not save the report anywhere. Deliver comprehensive analysis with these headings:

1. Non-mutation and environment verification (branch, SHA, worktree before/after, read-only tools used).
2. Executive findings with verified facts, most material uncertainties and whether the owner's issue was reproduced.
3. Owner's flat-provider contract vs current implementation, annotated expected tree and state table.
4. Architecture and lifecycle diagram from manifest -> service-worker -> background imports -> V3 and provider fragments -> ONE shared native writer -> Chrome callbacks/status -> native UI -> ONE click listener -> provider dispatch -> receipt.
5. Exact commit diff with changed files, real behavior shifts and unchanged Cloudflare elements.
6. Native state/cache/registration/recovery analysis (including failed/partial states).
7. Provider-specific deep dives: Google Drive, Dropbox, OneDrive and Cloudflare.
8. Chrome actual-install evidence versus mocked/synthetic evidence, including harness mismatch, policy blocker and coverage gaps.
9. All 97 failures categorized with test names, exact subsystem association and whether relevant to current complaint.
10. Twelve-hypothesis evidence matrix and uncertainty/confidence assessment.
11. Gaps and observations needed to establish a real root cause, including safe user-side screenshot instructions.
12. Final forensic verdict: what is source-proven, mock-proven, installed-Chrome-proven, remote-provider-proven, BLOCKED or UNKNOWN. Do not state that the issue was fixed.

For all key assertions supply an anchored code citation (commit permalink when possible), test name, log or other actual evidence. Include direct contradictions between specs and implementation. Separate intentional design changes from defects. Include credible counterexamples and fault paths, without running mutating fault injection.

**NO code or test modifications, NO solution proposal, NO commits or pushes, NO PR, NO transfers, NO browser profile modifications. STOP after the audit.**
