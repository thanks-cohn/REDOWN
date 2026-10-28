> **Current parity/size audit (28 October 2026):** Start at the [permanent living audit](../../DO_NOT_REPEAT_MISTAKES/explorer-parity/README.md). It supersedes older inferred parity/size claims, not historical evidence. Inspected `a7effa80b20a4d12f9e6837486ff1d7f7e52ebd9`. Local upload is capped at 300 MB in both Explorers; Test It hashing is separately 16 MiB; shared streaming copy/download have different limits. No parity roadmap implementation or deployment was made. Maintain action/limit rows and tests in the same implementation commit.

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

## 27 October 2026: Test It observes navigation and free-choice copying

Targeted repair on `beta-explorer`, starting at `aacde24ab140ebaa569206d59c5ddfecbfe028a7`. The 60 exercise IDs, Restart, ordinary Explorer commands and Take the Tour remain in place. Legacy Explorer and `main` were not modified.

### Causes and repairs

- **Parent breadcrumb:** detection used the nearest click-target ID and required `folder-open`, missing nested elements and bucket-root parents. Breadcrumb handlers now identify their origin explicitly. The completed, epoch-checked navigation signal includes previous/current location; Test It compares account, bucket and the exact immediate parent prefix. Grandparent jumps, Up-button navigation and failed listings do not pass this exercise.
- **Next/Previous:** the observer required ArrowRight/ArrowLeft even for button navigation, and preview signals fired when an image node was inserted rather than loaded. Both supported invocation methods now carry previous/expected/current file, direction and preview mode. Images signal completion only after load with nonzero natural width, and stale/error results cannot pass. Reopening an already rendered preview carries no navigation evidence. Previous must return to the image recorded by Next; that identity survives guide reopening.
- **Lightbox collapse:** collision avoidance moved the guide below the fullscreen target, then capped it at `max(80, target.top - gap - margin)`. Test It no longer shrinks to dodge preview bounds. It stays in the active dialog's top layer with a default 410 × 480 CSS-pixel card, clamped to the viewport. Backdrop overlap is permitted; bottom/right positioning is preferred when space is unavailable. Escape handling still dismisses Lightbox before Test It.
- **Resizing:** four unobtrusive 14-pixel corner hit areas provide the normal diagonal cursors and pointer capture. Minimum preferred size is 320 × 300, bounded by the usable viewport. Size persists in localStorage across steps, guide reopening and Restart. Viewport shrink clamps displayed dimensions without discarding the preference. Text/status scroll and the card itself can scroll if necessary to keep controls reachable. Existing six-dot grip markup, appearance and position rules are unchanged; only that grip moves the card.
- **Destination complexity:** removed A/B configuration, its folder-creation route, destination-approval prompts, location buttons and special destination-picker branch. Existing saved location metadata is ignored. A source still requires read-only approval. Paste uses its actual GUI destination; same-folder Paste selects Keep Both during Test It. Exact planned destination, receipt version/ETag, independent metadata/SHA-256 and unchanged originals are required before ownership is established. Different folders work without setup; cross-bucket copies require the existing adapter's explicit capability. R2 advertises its existing cross-bucket transfer support; unsupported adapters fail before writes.
- **Missed operation observation:** the last independently verified operation and its original exercise/command correlation are saved. Retry rechecks originals/copies and can replay that exact evidence for the same exercise, without another mutation. It cannot infer a shortcut or context-menu invocation. Newly created copies are shown by their actual bucket/key in subsequent instructions.

### Safety and remaining exercise limits

Original protection, current-session ownership, absent-before destinations, provider receipts, independent byte/metadata checks, collision rejection, conditional destructive capability gating, and uncertain-operation quarantine remain enforced. Restart archives ownership and unresolved recovery separately, starts exercise 1 with fresh results and performs no cleanup. It does not ask for destinations. No bucket or folder is automatically created by Test It.

The production R2 adapter still does **not** advertise atomic ownership-conditioned destructive mutations. This repair deliberately does not enable rename/move/delete by weakening that guard. Production-blocked or dependent exercises remain **26–27, 31–40, 43–45, 48–50, 53–56**, plus optional cleanup in 60. Cut may stage a verified copy, but its destructive Paste remains blocked. Other exercises require suitable participant files and supported operations. All 60 still need installed/live participant acceptance; this is not a claim that the full exercise run passed.

### Executed verification

| Check | Result / boundary |
| --- | --- |
| Focused: `node --test tests/test-it-copy.test.mjs tests/test-it-session.test.mjs tests/test-it-tools.test.mjs tests/beta-explorer.test.mjs` | **127 passed, 0 failed**, none skipped. Actual Explorer handlers in jsdom; adapter/embedded Worker fixtures use in-memory objects. |
| Breadcrumb regressions | Direct and nested clicks, root and nested exact parents, wrong ancestor/control rejection, and failed-listing rejection pass. |
| Preview regressions | Buttons and Left/Right, load-before-advance, repeated load rejection, error handling, expected previous image, Lightbox/Escape preservation pass. jsdom explicitly simulates image load; this does not prove browser decoding. |
| Panel regressions | Four corner directions, unchanged grip markup/movement, size persistence, viewport clamping, full-screen target bounds and active-dialog placement pass in DOM fixtures. Real visual/zoom acceptance remains unverified. |
| Copy/safety regressions | Same-folder actual Paste/Keep Both, arbitrary folder Paste, supported/unsupported cross-bucket capability, exact destination ownership, unrelated-object protection, ancestry through rename/move/duplicate/delete in capable mocks, failed/uncertain writes and recovery pass. |
| Restart/export/Tour/ordinary Explorer | Existing regression tests pass, including separate recovery JSON and fresh result records. |
| Full `npm run reliability:check` | **502 tests: 492 passed, 10 failed**. Syntax, API registry and issue inventory passed; architecture freshness failed. |
| Untouched starting-commit archive: `npm test` | **488 tests: 478 passed, 10 failed**. Failure names exactly match the final run. Seven historical catalog/debug/semantic/Nested failures plus architecture references, issue-label evidence and provisioning UI fixture. No frozen evidence was refreshed. |
| `git diff --check` | Passed. |
| Browser / installed Chrome | **NOT_TESTED**. No browser executable was present. Playwright browser installation failed: dependency installation hit container identity restrictions; browser-only download returned invalid/truncated ZIP archives. No administrator-policy bypass was attempted. |
| Live Cloudflare R2 | **NOT_TESTED**. No authenticated cloud reads, writes, deployments or participant exercise run were performed. |

Changed production files: `extension/beta/explorer.mjs`, `explorer.css`, `guided-interaction.mjs`, `test-it.mjs`, `test-it-session.mjs`, `file-api.mjs`, `r2-adapter.mjs`. The API change exposes one existing adapter capability, not a new file API or operation. Changed regression files: `tests/beta-explorer.test.mjs`, `test-it-copy.test.mjs`, `test-it-session.test.mjs`, `test-it-tools.test.mjs`; this handoff.

## 27 October 2026: Copy ownership visibility and targeted recovery repair

Starting commit: `9e0bc9a`, on `beta-explorer` only. Delivery is **partial against the requested production file-management acceptance**: visibility, navigation, automatic verification and recovery are repaired; R2's destructive operations remain unavailable for the precise provider limitation below. Main, Legacy Explorer, the six-dot grip, guide drag/resize implementation, and Test It Tools design are unchanged. No additional testing framework was introduced.

### Root causes and implemented changes

- Next/Previous compared navigation against the exercise-entry preview baseline; Previous additionally required the image cached by an earlier Next. Legitimate intervening navigation made those values obsolete. Detection now accepts only the real adjacent-navigation signal (button or keyboard, direction, previous/expected/current key), a different destination and successful image rendering. Unrelated preview opens and failed/repeated loads still do not pass.
- The Explorer never projected the session registry into its file rows. Registry-backed **Test Copy** labels and inset rich-red outlines now appear in List and Grid, independently of normal selection styling. Relevant originals receive **Original · Protected**. Rows retain their filenames, icons, sizes, dates and handlers. Painting runs after listings and successful ledger saves, including refresh, rename/move and deletion. Changed listing metadata or an unresolved action prevents a verified-copy marking; unresolved tracked locations show **Checking test action**. Filename patterns never establish ownership.
- Guide instructions previously named only a working copy and displayed internal capability paragraphs. They now identify the exact original and current copy by bucket/key, maintain original ancestry across rename/move/duplication, and show the known return destination for move-back. Capability diagnostics stay in JSON. A blocked operation explains briefly that the bucket cannot safely complete the change and the copy is untouched.
- Exercise 24 forced original-folder navigation and Refresh despite already knowing both identities. Entering that exercise now performs fresh remote metadata/SHA-256 checks on originals and remaining copies, checks the current copy, records exact evidence and unlocks Next automatically. Exercises explicitly testing Refresh still require Refresh.
- A single global conditional-mutation flag blocked all non-copy operations. The policy now evaluates explicit **per-operation** contracts, after checking current-session ownership and fresh source identity/content. A capable provider receives exact session/source/destination records through the existing API options. Rename/move contracts require identity enforcement, no overwrite and verified destination before deleting the source; delete requires exact identity enforcement. A global boolean alone cannot enable an operation. No production capability was falsely enabled.
- Recovery previously accepted only an unchanged source plus absent destination and rejected genuinely completed transfers; one uncertain write locked every later action. Recovery now checks saved terminal receipts against actual source/destination state and saved hashes, preserves logical IDs, and records reconciliation before advancing. Legacy saved receipts are supported. An explicitly failed source-read receipt plus unchanged source and absent destination can establish failure without mutation. Unknown writes cannot be cleared from negative reads alone: their source/destination locations remain quarantined, including across restart. Unrelated verified files can continue through the normal policy. Retry performs read-only reconciliation, never repeats writes. Export now includes pending action evidence as well as reconciliations and quarantines.
- Cut continues to stage a move without deleting. Paste executes the provider move; only verified destination bytes and absent source advance the ledger. The memory-provider GUI sequence verifies the same logical ID after both directions of movement.

### Exact production capability limitation

The embedded extension Worker uses `STORAGE.delete(keys)` for move cleanup and delete. Rename uses the universal move pipeline (copy then delete); its separate Worker rename action also deletes unconditionally. Worker transfer logic checks the destination and source metadata before cleanup, but an external replacement can occur between HEAD and DELETE. Those checks cannot enforce a version condition on the actual deletion. A Worker-only mutex would not exclude Cloudflare dashboard, REST/S3, or other external writers.

Cloudflare's current [R2 Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) documents `delete(key: string | string[]): Promise<void>` with no identity/version condition. Its [consistency documentation](https://developers.cloudflare.com/r2/reference/consistency/) also explains why an absent destination does not prove an unknown earlier write has stopped. Checked against current official documentation during this repair.

Consequently production R2 rename, move, destructive Paste and delete/cleanup remain **BLOCKED**, with JSON reason `R2_BINDING_DELETE_HAS_NO_VERSION_CONDITION`. Cut itself remains available for verified copies. Conditional destination creation, Copy/Paste, duplicate to an unused key, read-only checks, previews, approved-source copying and unrelated safe work remain available. The missing primitive is an exact-object-conditioned deletion (or a provider-enforced exclusive-write boundary covering every writer). There is no honest small Worker change that supplies that guarantee through the existing binding. No Worker was changed or deployed, and no operation is represented as atomic without enforcement.

### Executed verification

| Check | Result / boundary |
| --- | --- |
| Focused existing runner: `node --test tests/test-it-copy.test.mjs tests/test-it-session.test.mjs tests/test-it-tools.test.mjs tests/beta-explorer.test.mjs` | **143 passed, 0 failed**, no skips. |
| Actual Explorer handlers in jsdom | Copy existing image → same-folder Paste → Test Copy indicator → automatic original verification → rename → Cut/Paste into another folder → Cut/Paste back → duplicate extra copy → delete extra only → verify original/remaining-copy hashes → export/parse accurate JSON. Destructive half uses an explicitly conditioned, synchronous **in-memory provider**, not production R2. |
| Production R2 adapter + embedded Worker fixture | Creates/marks a verified copy, preserves original, marks List/Grid/refresh, verifies original automatically, then blocks actual rename dispatch with its exact diagnostic. No false rename success. |
| Preview regression | Buttons and arrows, actual simulated load before passing, repeat/error rejection, and extra legitimate navigation between Next and Previous. |
| Ownership/safety/recovery | Original and lookalike protection, destination collisions, source replacement and destination creation after client checks, rename/move identity retention, copy ancestry, terminal copy/move/rename/delete reconciliation without replay, legacy saved receipts, failed-before-write reconciliation, unknown in-flight-write quarantine, unrelated safe work, archived reservations, restart/export and persistence failures. |
| Existing interaction regressions | Tour, ordinary Explorer commands, all four guide resize corners, six-dot grip and drag persistence, viewport clamping, Test It Tools and keyboard controls pass. |
| Full `npm run reliability:check` | **518 tests: 508 passed, 10 failed**. Syntax, API registry and issue inventory stages pass. Architecture freshness stage fails. |
| Untouched `9e0bc9a` archive, separate checkout directory | **502 tests: 492 passed, 10 failed**. Failure names exactly match final results: seven historical catalog/debug/semantic/Nested failures plus architecture-reference, issue-label evidence and provisioning UI fixture failures. Frozen hashes/assertions were not changed. |
| `git diff --check` | Passed. |
| Installed Chrome | **BLOCKED / NOT VERIFIED**. Executed `node scripts/installed-chrome.mjs extension /tmp/redown-installed-chrome.json`: `CHROME_NOT_AVAILABLE_ENOENT`, zero installed assertions. No browser executable or real visual rendering is available here; DOM/CSS assertions are not installed Chrome proof. |
| Live Cloudflare R2 | **NOT TESTED**. No authenticated extension/provider acceptance sequence, live objects, deployments or live evidence export. |

The required production end-to-end sequence is **not passed**: R2 cannot safely execute its rename/move/delete steps under the specified copy-only boundary. The equivalent conditioned-memory sequence passes and exports evidence, but it does not certify live behavior or all 60 exercises. The original 16 MiB independent hashing budget, prior-session copy protection, no replacement of user destinations, quarantine of unresolved writes, and provider/version metadata limitations remain. No successful live result was invented.

Files modified: `extension/beta/explorer.mjs`, `extension/beta/explorer.css`, `extension/beta/file-api.mjs`, `extension/beta/r2-adapter.mjs`, `extension/beta/test-it.mjs`, `extension/beta/test-it-session.mjs`, `tests/beta-explorer.test.mjs`, `tests/test-it-session.test.mjs`, and this handoff.

## 27 October 2026: Critical follow-up, partial delivery

Base: `e6210dea9a1615b0ef9aa53fc0db83743999bfaa`, `beta-explorer` only.
**The primary R2 editing acceptance remains unmet.** No production destructive
capability has been enabled, and no unconditional deletion was substituted for
an identity-protected one. Main, Legacy, Worker source and the 60 exercises are
unchanged.

### Changes and causes

- Window Preview recognition no longer requires `expectedKey`, a redundant cached
  navigation prediction. It uses the real button/keyboard direction, previous
  and current identities, changed current preview and completed image rendering.
  Lightbox navigation cannot satisfy the Window exercises. An actual Previous →
  Next → Previous button regression passes; repeated load, failed render and
  unrelated refresh regressions remain. This is DOM evidence, not a reproduction
  of the owner's installed Chrome symptom.
- Native modal top-layer order was incorrectly inferred from HTML order. The
  generic confirmation dialog precedes Preview in HTML even when opened later.
  Every Beta modal now announces opening synchronously. The guide follows actual
  opening order, enters the active modal immediately, returns to the prior modal
  on close, and uses the modal bounds when its target is outside the modal. This
  preserves native focus/inert handling. A newly opened modal can reposition a
  previously dragged card to avoid its target; dimensions, grip, resize handlers
  and normal dragging remain unchanged. OS-owned file pickers cannot be overlaid
  by page content; no claim of that behavior is made.
- Rename Back previously stored a command filename without a verified logical
  object prerequisite. It now records the successful change's object ID, actual
  old location and new key. Back requires that same ID and exact return location.
  A failed/skipped first rename retains the verified name and explains the
  prerequisite. A successful first rename performed while on Rename Back is
  recognized, recorded against the first exercise and then requires the actual
  return rename. Saved verified prior evidence can restore this prerequisite.
- Failed destructive Paste now identifies moving as the failed operation and
  confirms the source remains in its folder. Cut and clipboard survive navigation
  and a blocked Paste. A quarantined/pending copy reports its unresolved prior
  action before another Cut/Paste; no new destructive attempt is dispatched.

### Provider investigation and remaining blocker

`file-api.mjs` forwards the session's exact ownership records through
`options.practice`. The production `r2-adapter.mjs` explicitly reports
`R2_BINDING_DELETE_HAS_NO_VERSION_CONDITION`. Background Rename uses Move's copy
then delete pipeline; cleanup calls the embedded Worker's `deleteKeys`, which
checks HEAD identities and then calls unconditional `STORAGE.delete(keys)`.
A replacement between those calls remains deletable. An application mutex
cannot exclude the dashboard, REST, S3 or other Workers.

Rechecked official [Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/),
[S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/) and
[consistency](https://developers.cloudflare.com/r2/reference/consistency/).
The binding's delete takes keys only; no documented exact-version-conditioned
DeleteObject alternative was found. Conditional PUT/Copy destination creation
cannot condition the later DELETE. Even an ETag-only comparison would not prove
upload-version identity after a same-content replacement. No undocumented header
or mock condition is treated as a production guarantee.

Missing capability: **source removal atomically conditioned on the recorded R2
upload identity**, or an enforceable exclusive-write boundary covering every
writer. Consequently R2 Rename, Rename Back, Move To, destructive Ctrl+V and
Delete/cleanup remain blocked. Copy/Paste and Duplicate to an unused destination,
Cut staging, ownership markings and read-only operations remain available.

### Verification

- Focused four-file suite: **146 passed, 0 failed**, no skips. Actual Explorer
  handlers run in jsdom; explicit image-load simulation and memory R2 are used.
- The conditioned-memory GUI sequence executes approved image Copy/Paste → Rename
  → Rename Back → Ctrl+X → folder navigation → Ctrl+V → Move To back → Duplicate
  → delete duplicate → unchanged original/content hashes → export and parse JSON.
  Same logical copy identity is asserted through all moves. This passes only
  with an explicitly conditioned memory provider, not production R2.
- Production adapter/Worker fixture asserts List/Grid labels, protected-original
  Rename, blocked copy Rename, honest Rename Back guidance, actual Ctrl+X/Ctrl+V
  failure, retained clipboard/source, no destination overwrite and no false pass.
- Existing recovery, source replacement, destination races, independent hashing,
  duplicate ancestry, cleanup ownership, restart, JSON export, Tour, four resize
  corners and six-dot grip regressions pass.
- Full reliability: **521 tests, 511 passed, 10 failed**. Syntax, registry and issue
  inventory pass; architecture freshness fails. An untouched `e6210de` archive
  runs **518 tests, 508 passed, the same 10 failure names**. These are historical
  catalog/debug/semantic assertions, Nested drag-handle expectation, architecture
  references, issue-label evidence and provisioning UI fixture. Frozen evidence
  was not refreshed.
- Installed Chrome command executed: **BLOCKED**, `CHROME_NOT_AVAILABLE_ENOENT`,
  zero installed assertions. No real rendering/focus or installed acceptance pass.
- Live R2: **NOT TESTED**; no authenticated object mutations or Worker deployment.
  The requested real-world acceptance/export sequence is **not passed**.

Files: four Beta production modules (`explorer.mjs`, `guided-interaction.mjs`,
`test-it.mjs`, `test-it-session.mjs`), three existing regression files
(`beta-explorer.test.mjs`, `test-it-copy.test.mjs`, `test-it-tools.test.mjs`) and
this handoff. Existing 16 MiB read-back budget, session-only ownership,
no-overwrite protections and unknown-write quarantine remain in force.


## 27 October 2026: Repeated critical request, current-head verification

Inspected untouched `7a65821` on `beta-explorer`. The requested preview,
modal-opening order, Rename Back prerequisite and recoverable clipboard changes
are already present in that head. This follow-up makes **no runtime changes**
and enables **no additional operations**. The primary production R2 editing
acceptance is still **unmet**.

Rechecked the official Workers API reference and S3 compatibility table:
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/r2/api/s3/api/

The binding still documents `delete(key: string | string[]): Promise<void>`.
The S3 table documents conditional Head/Get/Put/Copy, but no conditioned
DeleteObject. No supported atomic removal conditioned on the recorded upload
identity was found. The existing background cleanup checks metadata before an
unconditional delete; adding a Worker mutex or another HEAD does not exclude
external writers. No undocumented header, tombstone overwrite or weakened guard
was substituted. A backend endpoint wrapping this same primitive would retain
the race. An alternative would require a provider-enforced write boundary for
all writers or a different storage operation contract, not a capability flag.

Executed on the unchanged checkout with Node v24.22.1:
- Focused four-file suite: **146 passed, 0 failed**, no skips.
- Full `npm run reliability:check`: **511 passed, 10 failed**; syntax,
  API registry and issue inventory stages pass; architecture stage fails.
  The runner classifies seven failures as known and three as new relative to
  its older baseline (architecture-reference, issue-label and provisioning UI).
  All ten occur before this documentation-only change.
- Installed Chrome command: **blocked**, `CHROME_NOT_AVAILABLE_ENOENT`, zero
  installed assertions. Live Cloudflare R2: **not tested**. The required real
  provider acceptance sequence and live JSON export are **not passed**.

Only this handoff changed. No Worker deployment or cloud mutation occurred.
Rename, Rename Back, Move To, destructive Paste and Delete remain unsupported
for production Test Copies under the required identity-protected removal rule.
Copy/Paste, unused-destination Duplicate, Cut intent and read-only operations
retain their existing behavior. Main and Legacy Explorer remain unchanged.


## 28 October 2026: New Folder and measured Test It overhead repair

Base: `2a34d8ed76561328f1db5ee0fda5b49578bd5174`, branch `beta-explorer`.
**Partial delivery: the mandatory production R2 two-file Move acceptance remains
BLOCKED. No installed/browser or live-provider acceptance is claimed.**

### Audit findings and consolidation

Inspected the 60 exercise definitions, session/ownership policy, canonical
Explorer command events, universal file API and R2 adapter, embedded primary
Worker, preview/lightbox forwarding, clipboard and destination chooser,
reconciliation/recovery, persistence, tools and guide lifecycle. Kept the same
60 exercises and existing operation engine. No additional framework/dependency.

Source-confirmed overhead:
- Each successful mutation reconciled every unaffected live copy, downloading
  and hashing them again. Work grew with the accumulated object count.
- Reconciliation saved its full snapshot twice on the success path. Every save
  also repainted all ownership rows and replaced instruction text, even for
  progress-only evidence. Automatic original verification redundantly checked
  the working copy after a complete inventory check.
- Guide placement ran twice per exercise presentation and in full for every
  drag/resize pointer event. A body-wide child-list observer also scheduled
  placement for file rendering and the guide's own changing text.
- Each low-level click/input/change/pointerup queued a separate fallback GUI
  observation. Repeated pass signals and duplicate logical move identities
  could be counted again. No growing guide listener set was demonstrated.

Removed the second successful-reconciliation save and duplicate automatic copy
check, consolidated show placement to one calculation, and removed the
child-list subscription. Mutation reconciliation now checks affected copies;
explicit inventory/original checks and cleanup retain full verification.
Original verification, per-source identity/content checks, destination absence,
provider receipt requirements, source absence checks and pending journals stay.
Retry outside inventory exercises uses targeted reconciliation. Unknown writes
are not replayed. Noncritical progress saves coalesce in one microtask; critical
journals still await serialized storage writes before dispatch and after receipts.
Snapshots still grow with evidence/recovery history; this is batching, not an
append-only storage migration or a guarantee of constant serialization cost.

Ownership paints now occur on ownership changes or Explorer render, use one
visible-entry lookup map, and replace instruction text only when it changes.
The canonical Explorer command IDs remain the command correlation source;
fallback GUI observations coalesce, pass signaling is idempotent, and multi-file
progress deduplicates logical IDs and checks both current destination records.
Test It exposes destroy cleanup using abortable listeners and removes pending
fallback timers/handlers. Guide stop disconnects its observer and global events.
No separate mutation engine or duplicate provider listener was introduced.

### Folder behavior and backend capability

New Folder uses the unchanged ordinary Explorer dialog and existing mkdir API.
Test It checks both the exact object name and directory prefix, persists a
separate `practiceFolders` journal, then invokes the existing folder route with
`createOnly`. The background preflight checks collisions and requires the actual
Worker capability `createOnlyFolders`. The embedded Worker now advertises that
capability and rejects an existing marker when its atomic `If-None-Match: *` PUT
fails. Ordinary legacy ensure-prefix semantics are unchanged when the flag is
absent. No automatic Worker deployment/provisioning occurs.

Folders are not Test Copies. Neither folder creation nor a marker authorizes
recursive deletion or deletion of unrelated children. Journals survive restart.
Creation is evidence-only: selection, clipboard and exercise remain intact.
New-folder navigation followed by Paste independently verifies the copy and only
then passes the Paste exercise. The production GUI/adapter/embedded-Worker path
passes this in jsdom with in-memory R2 storage. Installed Workers need the explicit
create-only capability update before this guarded practice route is available.
A namespace preflight is a point-in-time check, not a lock excluding external
writers from later creating children. Those children never acquire ownership.

### Move/Paste status and fault coverage

No conditional-removal capability was implemented or advertised for R2.
The actual blocker is still `R2_BINDING_DELETE_HAS_NO_VERSION_CONDITION`:
`STORAGE.delete(key | keys)` cannot condition removal on a saved upload version.
The background's current pre-delete HEAD checks are subject to an external
replacement between HEAD and DELETE. Another HEAD, Worker-local mutex, or a
conditional marker PUT cannot close that external-writer race.

Rechecked official documentation on 28 October:
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/r2/api/s3/api/

No documented version-conditioned deletion or conditional DeleteObject contract
was found. Destructive practice guards remain disabled for this production
adapter. A provider-enforced conditional delete or enforceable exclusive boundary
covering all writers is needed to meet the requested original-safety contract.
No undocumented delete headers, false capability flags or tombstone overwrites
were substituted. The generic refusal was not cosmetically relabeled as a fix.

The required GUI sequence now has an explicitly identified **conditioned memory
adapter** integration test: create two Test Copies, select both, create a new
folder, retain both selections and exercise, Move To, verify both destination
hashes/source absence, retain both logical IDs, and show both red Test Copy
markings. It passes through the ordinary Explorer and universal API batch. This
is NOT evidence that production R2 can perform protected removal.

Existing API batching records each one-file result independently. The clipboard
now drops only completed move entries after a partial Cut/Paste, retaining
incomplete/unprocessed entries; repeated error strings are consolidated.
Regression coverage includes first-file success with second-file ownership
replacement/rejection, independent destination conflicts, interrupted/unknown
writes, restart/retry without destructive replay, lost receipts, and source
replacement after client checks. Pending multi-entry operations that bypass
Explorer's ordinary per-entry batching still reconcile as a whole; partial
multi-entry recovery was not redesigned. No claim of a live interrupted R2 batch
recovery pass is made.

### Layout and measurements

Default width is 360px and default height follows content, bounded by the viewport.
Manual dimensions/position remain authoritative, including modal host changes.
There is one card scroll surface; text/status no longer create nested scrollbars.
Automatic placement tests sides/above/below and chooses the least-overlapping
corner if none fits. Fullscreen content can have no nonoverlapping rectangle;
manual placement is not overridden to chase a target. Cached pointer geometry
avoids full placement reads during drag/resize. Modal/window/scroll changes,
step presentation and changed status still schedule relevant placement.

Local benchmark, Node v24.22.1, 15 samples/checkpoint, 1 MiB files:

| Seeded copies/checkpoint | Before p50 / p95 ms | After p50 / p95 ms | Inspections per Copy |
| --- | --- | --- | --- |
| 0 | 5.09 / 7.98 | 4.59 / 7.67 | 6 → 6 |
| 20 | 18.25 / 24.36 | 4.69 / 5.39 | 26 → 6 |
| 40 | 32.61 / 41.20 | 5.10 / 5.77 | 46 → 6 |
| 60 | 45.28 / 54.68 | 5.13 / 6.72 | 66 → 6 |

These are memory-provider session times, including SHA-256 and snapshot costs,
not click/paint latency, network duration or a participant completing 60 exercises.
Timing noise and GC apply. Successful-copy session writes fall from 5 to 4;
20 simultaneous progress saves fall from 20 to 1. Each real adapter inspection
normally entails before/after metadata reads and a byte download, with pagination
potentially adding calls. Remote request counts and Cloudflare latency were not
measured. Raw results include serialization sizes and noisy Node heap deltas;
these do not establish browser memory usage or absence of a memory leak.

The lifecycle regression runs 60 guide transitions, checks registrations at
20/40/60, stops/reopens 10 times, and verifies the listener count returns to its
starting value. Appending 100 file rows triggers no placement reads. One hundred
grid-pointer drag events cause zero extra placement reads after pointerdown.
These are jsdom assertions, not a real browser layout benchmark.

| Requested interaction | Verified evidence | Browser p50/p95 and network time |
| --- | --- | --- |
| Startup, exercise changes, Retry, Restart, JSON export | Local GUI/session regressions pass | Not measured |
| New Folder then navigate/Paste | Actual Explorer + adapter + Worker in memory passes | Not measured |
| Preview Next/Previous and Lightbox | Local rendered-state event fixtures pass | Not measured |
| Guide drag/resize and modal positioning | Geometry/lifecycle fixtures pass | Not measured |
| Copy/Paste | Independent SHA-256 memory integration passes | Session benchmark above only |
| Rename/Move, two-file new-folder Move | Conditioned memory provider passes; production R2 blocked | Not measured |

### Verification and remaining acceptance

- Focused five-file suite: **182 passed, 0 failed**, no skips.
- Full `npm run reliability:check`: **533 tests, 523 passed, 10 failed**.
  Syntax, API registry and issue inventory pass; architecture freshness fails.
- An untouched archive of the base commit, executed from its own directory with
  the same dependencies: **521 tests, 511 passed, the same 10 failure names**.
  The runner labels three of those as new against its older built-in baseline;
  the fresh base-commit comparison confirms they predate this change. Historical
  evidence hashes were not refreshed to hide failures.
- `node scripts/installed-chrome.mjs extension /tmp/redown-installed-chrome.json`:
  **BLOCKED: CHROME_NOT_AVAILABLE_ENOENT**, zero installed assertions.
- Live R2: **NOT TESTED**. No Worker deployment or authenticated cloud mutation.
  No real browser startup/click/paint/DOM/layout/storage/network percentile or
  extended 20/40/60-exercise acceptance is available. No zero-lag guarantee.

Reproduce session measurements with `node scripts/test-it-benchmark.mjs BASE_SHA`
and `node scripts/test-it-benchmark.mjs`; results and regression-name comparison
are in [verification/test-it-latency](verification/test-it-latency/).
Main and Legacy Explorer UI/ordinary operation behavior remain unchanged; only
explicit create-only requests opt into the shared Worker addition. This commit
ships the safe folder/performance repairs, not final production-move acceptance.

## 28 October 2026: Unlimited question history and authoritative retries

Base: `f48001de228fe240f9f4d5ffaa711d2bb0240226`, `beta-explorer` only.
Both annotated checkpoint tags still peel to this commit. Neither tag was changed.
Main, Legacy Explorer, the provider implementation and all 60 exercise definitions
are unchanged.

### Participant controls

- **Previous** goes back one question, without a distance limit, and is disabled
  only on question 1. Click **Question N of 60** for the compact, filterable
  **Question History** list. It contains every question reached, with its current
  verdict and a Retried marker. Selection is direct; no intermediate exercises run.
  Escape, outside pointer press, the counter and selection dismiss the list.
- Opening an old question is review only. Its **Previous result** remains visible
  separately from interaction messages. Review does not dispatch cloud operations,
  reconcile files, clear evidence, or undo previous file changes. Future questions
  retain the existing Next/Skip progression rules.
- **Retry** explicitly begins a new attempt, even after PASSED or NOT_TESTED.
  A draft holds new evidence while the authoritative record keeps the previous
  result. A matching verified completion replaces exactly that exercise's record.
  BLOCKED and UNCERTAIN outcomes remain accurate; uncertain evidence never passes.
  **Cancel attempt**, Skip during a retry, and superseding an unfinished attempt
  retain the authoritative record. Closing the guide retains the unfinished attempt.
- **Return to Question N** keeps the first departure position through multiple
  historical jumps and returns directly without replaying intervening work.
  The passed count always reduces the 60 current records, never attempt totals.

### State, dependencies and asynchronous evidence

`test-it-history.mjs` is a small session-state helper, not another database or file
engine. `questionHistory` lives in the existing `betaExplorerTestIt` snapshot:
highest reached, current `index`, return origin, review mode, active draft/identity,
compact attempt metadata and relevant partial-interaction state. Existing serialized
storage writes and working-copy ownership journals are reused. JSON export includes
one authoritative `records` entry per exercise and separate compact attempts.
Attempt metadata includes identity, exercise, ordinal, times, result, operation,
command correlation when available and diagnostic reason. Provider response bodies
are not copied into each historical attempt. Session restart remains explicit.

Ordinary Explorer commands still perform all file operations. Instructions resolve
live ledger objects, show their current verified location, and explain missing-copy
setup. Return exercises retain per-exercise verified return locations, including both
members of a multi-file move. Rename Back restores its logical-copy prerequisite,
uses the current name, and explains the already-returned-name case. Learning a
prerequisite while retrying Rename Back no longer credits a different exercise.
No file is automatically moved, renamed, deleted or recreated by navigation/Retry.
Retry may reconcile genuinely unresolved existing journals with targeted reads;
it does not replay old successful evidence as a new pass.

Operation evidence carries exercise and stable attempt IDs. Explorer captures these
before Rename/Delete/destination dialogs, batch dispatch, download preflight and
preview/folder/refresh awaits. Late verified operations can finish their originating
attempt while another question is viewed or the guide is closed. Canceled or
superseded attempt callbacks cannot replace newer results. Latest uncertain receipts
may reconcile to verified evidence only for the same unsuperseded attempt. Pending
multi-file observations retain their own partial evidence. Queued fallback UI events
and asynchronous observation checks reject obsolete question generations.

The shared floating guide gains optional Test It history controls; Tour defaults,
six-dot grip, corners, resizing, modal hosting and placement algorithms remain.
The list has a bounded scroll area and no permanent sidebar. Long entry names wrap.
Cancel and direct Return sit below the main action row to retain spacing.

### Verification

- Focused `node --test tests/beta-explorer.test.mjs tests/test-it*.test.mjs`:
  **180 passed, 0 failed**. Coverage includes the three specified direct jumps,
  all 59 Previous actions, all visited entries/future gating, inert review, fresh
  retries, cancellation, accurate failed/uncertain replacement, stale attempts,
  direct return/multiple jumps, counts, export and storage reload. Actual Explorer
  handlers, preview predicates, clipboard, multi-file return and ordinary
  adapter/embedded-Worker regression tests remain in this suite.
- New historical file-operation fixture performs Copy then historical Rename at
  the current copy location, verifies replacement, checks every unrelated record,
  returns directly and parses the export. A separate observation-only historical
  Grid retry passes. Delayed Rename fixtures cover navigation, cancellation,
  a newer retry and closing/reopening the guide; stale preview correlation is tested.
- **240 historical jumps:** zero remote inspections, one guide card, 60 records,
  no new attempts from review. Local jsdom timing diagnostics are in the focused
  log, not installed-browser latency measurements. Existing lifecycle tests retain
  fixed listener sets across 60 transitions and repeated reopen/drag/resize.
- Full `npm run reliability:check`: **556 tests, 546 passed, 10 failed**, no skips.
  Syntax, API registry and issue inventory stages pass; architecture freshness fails.
  An untouched archive of the actual base runs **540 tests, 530 passed, the same
  10 failure names**. The runner calls three new relative to its older pinned
  baseline, but the fresh comparison proves they predate this change. Frozen
  evidence, baseline assertions and the architecture map were not rewritten.
- Existing local memory benchmark retains six inspections, four critical saves
  per Copy and one save for 20 coalesced progress calls at 0/20/40/60-copy checkpoints.
- Installed Chrome: **BLOCKED**, `CHROME_NOT_AVAILABLE_ENOENT`, zero assertions.
  Live R2: **NOT TESTED**. No authenticated extension/R2 session or real objects
  were used. No deployment or provider configuration change occurred. The requested
  installed-Chrome/live-R2 acceptance sequence remains open, including rendered
  spacing, focus and real network behavior. Memory-provider tests do not close it.
- Existing limitation remains: outstanding download completion has no durable
  provider recovery journal across a full page/extension process reload. Attempt
  identity/results persist, but such a download needs a fresh explicit retry and
  cannot be inferred successful. Existing uncertain mutation journals still use
  their established read-only recovery path.

Evidence: [focused log](verification/question-history/focused.log),
[baseline/final comparison](verification/question-history/verification.json),
[Chrome result](verification/question-history/installed-chrome.json),
[memory benchmark](verification/question-history/benchmark.json).

## 28 October 2026: Critical Legacy/Beta parity and limits audit

Audited the committed request at `a7effa80b20a4d12f9e6837486ff1d7f7e52ebd9` on `beta-explorer`. [Permanent index](../../DO_NOT_REPEAT_MISTAKES/explorer-parity/README.md) links the complete action matrix, hard-limit register, reuse/bloat audit, phased roadmap and acceptance plan. This is source-backed discovery plus local characterization, not implementation of the larger roadmap or release acceptance.

Confirmed source-level Beta losses include scoped remote search, archive-entry preview/download/cross-bucket extraction, metadata/MOV/3D preview coverage, public-access enablement, browsable destination folders, sort/paging/touch/history surfaces, safe pre-write retries, blocking download waits and an extra Worker prerequisite for local upload. See R1–R14 in the matrix, including explicit live/unverified boundaries.

Both local upload routes reject above 300,000,000 bytes; no active multipart uploader was found. The 16 MiB independent SHA-256 check is practice-only. Known-length TRUE REMOTE streams up to the shared default 300 MiB policy; unknown-length ingestion buffers. Cloud copy/move/rename already share verified streams; Chrome handles downloads without whole-file JS buffering. Nested 25/30-second deadlines, single-put constraints, Worker memory/subrequest limits and archive decompression buffers still prevent unlimited claims. Current provider docs do not independently establish the project's exact 300 MB REST attribution; do not remove it without endpoint proof or an implemented alternate route.

Verification commands/counts, baseline comparison and evidence live in the [acceptance reference](../../DO_NOT_REPEAT_MISTAKES/explorer-parity/EXPLORER-PARITY-ACCEPTANCE-AND-REGRESSION-PLAN.md) and its evidence/verification.json. Full suite retains ten same baseline failures. Browser probe found Chrome but administrator policy blocks unpacked extension loading; zero installed assertions, live R2 untested. No user/cloud objects were read or mutated, Workers deployed or credentials configured; historical hashes/tags and main are unchanged. Six non-destructive audit tests were added; production code was not changed.

Next work follows the [integrated parity sequence](../../DO_NOT_REPEAT_MISTAKES/explorer-parity/BETA-EXPLORER-PARITY-ROADMAP.md): truthful duration/outcomes and upload availability, then reuse current search/archive/preview services. Every operation/limit/provider change must update the permanent matrix/register and matching regression tests in the same commit.
