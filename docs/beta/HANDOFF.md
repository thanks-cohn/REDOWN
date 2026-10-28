# Simple Test It implementation, October 27, 2026

Base: `7c0447b9bbc73ecf042c47051b199ca6e8c46e65`, branch `beta-explorer`.
The abandoned implementation was not used. Main and Legacy are unchanged.

## Delivery status: partial, destructive exercises fail closed

Final safety review found no atomic session-ownership enforcement in the current provider route. **Production Test It blocks rename, move and delete, including cleanup.** Copying, browsing and read-only guidance are implemented; the requested full copy-modification workflow is unfinished. Local ledger mutation tests use an explicitly capable mock and do not prove a capable production backend.

## Built

Menu → Test It reuses Take the Tour's guide/highlight component. Sixty connected exercise definitions have interaction/state predicates, Retry, Skip and X. Next unlocks only on the matching observed interaction or verified mutation; skipped work stays NOT_TESTED. Existing navigation, clipboard, keyboard, drag, preview and file-operation paths are reused. Export and optional exact-copy cleanup are in the menu.

A persisted session ledger records approved read-only originals, approved existing-bucket destinations, copy receipts, ancestry, hashes, metadata identity, pending writes and all 60 results. Mutations pass through the existing universal API policy hook, including batches. Ownership requires absent-before destination, a verified provider receipt with object version, and independent remote metadata plus SHA-256 read-back. Rename/move retain IDs; copies get new IDs and ancestry. Lookalike names and identical bytes alone never grant ownership. Every mutation rechecks originals and involved objects. Multi-selection destructive actions reject mixed ownership before batch dispatch. Replace, recursive folders, uploads, provisioning, bucket creation and URL ingestion are blocked while practicing. No setup/deployment runs automatically.

Uncertain writes persist a mutation lock. Retry only reads/reconciles; it never repeats a destructive write. Ambiguous created destinations need manual review and are not adopted from filenames. Exit never deletes copies. Cleanup lists exact tracked live copies and requires confirmation, then uses the same guard. Browser storage failure prevents dispatch.

## Verification and honest coverage

- Exactly 60 definitions and handlers are present. This is **not** 60 accepted working exercises.
- Focused local suite before final refinements: **79 tests passed, 0 failed**. Includes all 60 guide targets in the local DOM, X/skip/resume, original cut/delete prevention through actual toolbar handlers, prior Beta/tour regressions and session safety cases.
- Local operation fixtures cover copy → rename → move → copy ancestry → delete, external same-byte replacement, user destination collisions, mixed selection rejection, uncertain write lock and persistence failure.
- Installed Chrome: **NOT_TESTED**. No Chrome binary is available in this execution environment.
- Live Cloudflare/R2: **NOT_TESTED**, no participant-approved source files/destinations were supplied here and no live objects were mutated.
- Full 60-exercise participant run: **0 independently accepted; all 60 require browser/live acceptance**. No full-session completion claim.
- Final suite/reliability counts are appended below after completion.

## Limits and remaining work

1. Practice-file independent hashing uses a bounded **16 MiB** budget. Larger sources are blocked, not silently unverified. Existing normal transfers are unaffected.
2. Identity checks use receipt versions and independently read REST metadata (ETag, size, upload timestamp, version where exposed), plus SHA-256. These are client preflights over existing server operations, **not an atomic server ownership transaction**. Concurrent external replacement between final check and delete is an unresolved race in the existing provider path; production destructive practice is therefore blocked before dispatch. Do not represent this build as satisfying an absolute concurrent-writer safety guarantee. Server-side session provenance/conditional ownership enforcement needs a separately reviewed implementation before release acceptance.
3. Replace is intentionally blocked. Conflicts use Skip; collisions with unrelated files are blocked even for Keep Both. Duplicate needs an unused generated destination. Repeated duplicates may require choosing another working copy/name.
4. No Undo subsystem was added. Return exercises use existing Move to / Cut/Paste.
5. Unknown completed writes with lost receipts remain locked for manual review. They are not automatically adopted or cleaned up.
6. Download acceptance uses Chrome's completion report where available; local downloaded bytes are not independently hashed. A merely started download is UNCERTAIN.
7. Multi-file moves run the existing per-file batch operations; a partial/unknown result may require manual reconciliation. All 60 interactions still need an end-to-end participant run, especially multi-move return, repeated duplication, conflict resolution and keyboard provenance.
8. The result file includes approved exact object paths for useful review. Auth credentials and raw URL-bearing provider payloads are not exported.

Files: `extension/beta/test-it.mjs`, `test-it-session.mjs`, `guided-interaction.mjs`, `file-api.mjs`, `r2-adapter.mjs`, `explorer.mjs`, `explorer.html`; `tests/test-it-session.test.mjs`, `tests/beta-explorer.test.mjs`.

## Final local results

Final safety test file: **8 passed, 0 failed**, including production fail-closed behavior when the adapter cannot enforce conditional ownership. Focused Beta/tour/session suite immediately before that final gate: **79 passed, 0 failed**. Full suite at that tested snapshot: **454 total, 444 passed, 10 failed**. Reliability: syntax/registry/issue stages passed; architecture freshness failed; full suite retained 10 failures. Those failure names match the existing recorded catalog/debug/semantic/architecture, Nested drag-handle and provisioning debt, but no fresh checkpoint comparison was run in this time box. The final fail-closed change was separately syntax checked and tested with the eight safety tests. Do not call the full suite green.

At least exercises 26, 27, 32, 33, 35–37, 39–40, 43–45, 48–50, 54–56 and cleanup in 60 are blocked or dependent on blocked destructive work. All other exercises remain unaccepted until a participant browser/live session proves them. Functional end-to-end count is not established; independently completed full live exercises: **0**. This is a committed partial implementation, not completion of the final acceptance criterion.

## Test It spacing, anchored tools and restart, October 27, 2026

Base: `5ee42d75f8af165e901dc54d9ae9c9420e5e9b88`; delivery branch: `beta-explorer` only.

- Preserved the original six-dot `⠿` glyph, font size, pointer capture, keyboard movement and drag behavior. The Test It-only card now has a 410px responsive width, generous padding, a reserved 44px grip target, balanced progress/close controls, clearer instruction/status spacing and separated actions. Tour styling is unchanged.
- The tools remain a fixed bottom-right trigger with an ordinary absolutely anchored upward menu. Added Restart Test It alongside the three existing actions, increased row spacing, preserved outside-click/Escape/focus dismissal and keyboard navigation. Guide positioning reserves the trigger area and moves the instruction card clear when the menu opens; short viewports use bounded scrolling.
- Restart uses the existing confirmation dialog. In-flight operations/checks and cleanup block restart; pending operations are reconciled through read-only metadata/hash checks. Ambiguous writes that cannot be proven safe block reset for manual review and are never replayed.
- Successful restart replaces `betaExplorerTestIt` with a new session ID, index zero and fresh exercise records, clears transient guide state, and opens exercise 1. Serialized storage writes prevent older queued progress from overwriting the fresh session. Storage/reconciliation failures retain prior results.
- A separate `betaExplorerTestItOwnership` record retains originals, destinations and tracked copies across restart; existing copy provenance and cleanup safety checks remain. Restart issues no cloud mutations. Downloaded reports are untouched; the new ID gives subsequent exports a new filename.
- All 60 exercise definitions, copy-only destructive protections, ordinary file operations and preview code remain unchanged. Production rename/move/delete/cleanup still fail closed without atomic provider ownership support, as documented above.

Verification:

- Focused session/menu/grip tests: **15 passed, 0 failed**. Includes the unchanged glyph, drag/keyboard/resize behavior, all four menu actions, separate ownership, reset results/ID, storage failure, unresolved writes and in-flight blocking.
- Actual Test It UI handler tests: **3 passed, 0 failed**, including confirmation cancellation, successful restart at exercise 1, 60 clean results and unchanged fixture cloud objects.
- Full reliability run: **453 passed, 10 failed, 0 skipped**. Seven recognized historical failures plus three already present in the base (Explorer architecture references, issue-label evidence and provisioning UI fixture). The three additional failures were reproduced from an unmodified archive of the base commit. Syntax, registry and issue-inventory stages pass; architecture freshness remains failed. No frozen evidence hashes were rewritten.
- `npm run check` and `git diff --check`: passed.
- Rendered visual acceptance at desktop/mobile sizes and installed Chrome: **NOT_TESTED**. No Chromium binary was installed; the browser download returned an invalid archive. DOM tests cover pointer movement, viewport clamping and menu behavior, not actual rendered appearance.
- Live Cloudflare/R2: **NOT_TESTED**. No real cloud objects were mutated.

## October 27 critical repair follow-up

Base: `fcb3246` on `beta-explorer`. **Partial delivery: the final live copy/rename/move/delete acceptance criterion is NOT met.** No claim of a passed uninterrupted R2 sequence or completed 60-exercise session.

### Causes and repairs

| Issue | Defective layer / finding | Change and remaining boundary |
| --- | --- | --- |
| Copy recognition | Observer depended on captured/synthetic input; Explorer emitted Copy/Cut before assigning the clipboard. | Explorer emits committed clipboard identities, command UUID, source, destination and explicit context-menu/keyboard/toolbar provenance. Method-specific predicates remain enforced. Existing user-session screenshots/JSON were not available as attachments in this checkout, so their exact failure path is not independently reproduced. |
| Rename ownership | Deliberate production adapter capability gate, not a missing ledger lookup. Worker rename/move/delete ultimately use unconditional R2 deletion after preflight checks. | Guard retained. Matching metadata, version and SHA-256 do not atomically bind deletion to that object. Enabling a Boolean would expose an external-replacement race. Old-session destructive targets are additionally rejected; exposed destination versions must match the receipt. **Production rename/move/delete remain blocked.** |
| Cut/Paste | Cut already leaves sources intact. Paste is a distinct asynchronous move, blocked by the same production gate. Observer also used mutable command state and incomplete multi-file return identities. | Freeze exercise/command correlation per operation, retain late evidence on its originating exercise, and track logical IDs plus source locations across multi-stage moves. Capable mock passes the existing ownership chain; production move is not enabled. |
| Escape and image navigation | Guide capture could dismiss Test It while focus was on its controls; Preview explicitly ignored guide focus. Preview stopped keyboard propagation before the observer; image predicates used getElementById with a CSS selector. | Preview owns Escape over Test It when open, respects a newer transient dialog/context menu, and reports Lightbox/arrow transitions directly. Guide defers to higher layers. Correct image selectors. Existing Tour behavior retained. |
| One destination | No two-location prerequisite existed; destinations were approved ad hoc during writes. | Exercise 21 approves the source at A and uses the existing destination picker for distinct B. Same-bucket folders are supported. A missing prefix requires explicit folder-marker authorization through existing mkdir; no bucket creation. Production writes require both locations. Unapproved destinations and cross-bucket practice are rejected. |
| Export truth | Automatic list/preview observations overwrote verified mutation operation/response fields. | Read observations, command interactions and API evidence are retained separately. Observation mismatches/callback failures are recorded as observer failures, not provider failures. |

The guide displays both locations and the current working copy, provides Open Location A/B controls, and explains unsupported destructive steps instead of asking the user to try an impossible operation. Source setup is generation-checked against Skip/exit. Workflow copy ID, rename origin and move-return locations persist across resume; restart clears transient workflow/results without modifying cloud files. The six-dot grip, drag behavior and anchored tools drop-up remain. Preview target placement avoids the highlighted navigation control when practical; actual rendered positioning still needs browser acceptance.

### Verification boundaries

- Focused DOM/adapter/session/Tour/menu suite: results appended below. These execute real Explorer handlers in jsdom and the production embedded Worker against in-memory R2, **not installed Chrome or live Cloudflare**.
- New DOM sequence: approve A/B → actual context-menu Copy → recognize exercise 22 → navigate to B with clipboard intact → Paste → independent fixture metadata/SHA-256 → recognize exercise 23. Toolbar is recorded but cannot satisfy the context-only exercise; Ctrl+C satisfies its keyboard exercise.
- New Preview sequence: open image → Right → Left → Lightbox → Escape with focus on Test It → Lightbox closed, Window Preview and Test It preserved, exercise 18 passed.
- Session fixtures cover exact ownership, original/collision protection, same-byte external replacement, copy → rename → move → descendant copy → delete, ambiguous writes, restart, two distinct locations, approved empty-folder creation and rejection of cross-bucket/unapproved destinations. Capable-mock behavior does not establish production conditional deletion support.
- Installed Chrome: **NOT_TESTED**; no chromium/chromium-browser/google-chrome/google-chrome-stable executable was available. No policy bypass attempted.
- Live Cloudflare R2: **NOT_TESTED**; no cloud objects were read or mutated for this repair. No authenticated participant source/destination sequence was executed.
- Required uninterrupted acceptance: **NOT PASSED / NOT EXECUTED LIVE**. The production ownership capability blocks step 9 (rename) and subsequent destructive steps. No evidence JSON claiming such a run was manufactured.
- Remaining production-blocked/dependent exercises: 26–27, 31–40 (Cut itself can stage an owned copy but its move cannot complete), 43–45, 48–50, 53–56, and cleanup in 60. Conflict, duplicate and restore exercises also depend on having the appropriate verified copies and free approved keys. All 60 still require participant installed/live acceptance.

Files changed: `extension/beta/explorer.mjs`, `explorer.css`, `guided-interaction.mjs`, `test-it.mjs`, `test-it-session.mjs`; `tests/beta-explorer.test.mjs`, `test-it-copy.test.mjs`, `test-it-session.test.mjs`; this handoff. Universal API, R2 adapter, embedded Worker, original Explorer and main were not changed.

Final local results for this repair: **99 focused tests passed, 0 failed**. Full reliability execution: **474 tests, 464 passed, 10 failed**; syntax, API registry and issue-inventory stages passed; architecture freshness failed. An unmodified archive of base `fcb3246` ran **470 tests, 460 passed, the same 10 failed**. Failure names matched: the seven recorded catalog/debug/semantic/Nested failures plus architecture references, issue-label evidence and provisioning UI fixture. The reliability registry labels those latter three new relative to its older pinned baseline, but they also fail on this repair's actual starting commit. No frozen evidence hashes or assertions were relaxed. `git diff --check` passed.
