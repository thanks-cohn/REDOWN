# Test It v2 rebuild handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `71001b58fae24ea2c83d833bf085326e96353950`. Final published SHA is supplied in the delivery response; this handoff is part of that commit.

**Partial implementation: 13 functional exercises, 47 blocked. Specification v2.0.0 defines all 60 stable IDs. Not installed-Chrome verified, not live-R2 verified, and not public-beta safety certification.**

## Delivered and verified locally

- Replaced the obsolete master exercise definitions and runtime mappings in place. The authoritative JSON and packaged copy are byte identical. Chapters A-F now follow the owner's workflow, with logical identities, prerequisites, transitions, backup requirements, recovery instructions and mandatory evidence. The known Copies/Archive filename collision at exercise 32 explicitly uses Keep Both, preserving the existing copy and following the returned key.
- Added explicit setup consent naming the selected account and bucket. No setup starts merely by opening Test It. A collision-resistant `REDOWN-TEST-IT/<uuid>/` namespace must be empty. Nine generated fixtures are uploaded using the existing universal API: two small PNGs and a text document in each of Protected Originals, Protected Backups and Working Area.
- Setup records write intent before dispatch, distinct logical IDs, fixture ancestry, exact keys, expected/verified SHA-256, existence and recovery identities. Every final object is freshly read through the existing preview API, completely hashed, and compared to its known fixture bytes. All nine are read again before readiness. A successful upload acknowledgement alone is insufficient.
- Failed or uncertain setup attempts retain object intent, prior namespaces and staging recovery keys. Retry creates a new namespace, never adopts matching filenames or replays an ambiguous write. No automatic cleanup occurs.
- **S01-001 through S01-013 work as a connected flow:** bucket opening, Working Area navigation and parent return, Refresh, precise picture/different-file selection, modifier multi/range selection, exact named filtering, name sorting, Grid and List. Five navigation exercises perform fresh independently correlated provider listings; eight verify actual DOM/interface state. All thirteen require verified practice setup.
- The existing Tour card engine supplies contextual highlighting and accessible X controls. Verified successes automatically advance. Incorrect actions cannot pass. Failed/skipped prerequisites block dependent activities. X removes temporary capture listeners, highlights and pending advance timers immediately. An in-flight setup upload settles and is retained; no subsequent upload starts after exit.
- One evidence path retains all sixty records, actual sanitized HTTP/IPC diagnostics, real monotonic timings or null, setup readback comparisons and explicit unsupported coverage. Setup measurements are separate from exercise action timings. The partial fixture export has thirteen PASSED, one BLOCKED, forty-six NOT_TESTED; it is prominently labeled local simulation.
- Saved v2 progress is separate from v1. Historical v1 exports, schema and verification samples remain unchanged as historical evidence, not current runtime definitions. Reopening saved practice requires fresh readback; old results are never interpreted as v2 results.

## Exact coverage and remaining work

| Measure | Count |
| --- | ---: |
| Defined stable exercises | 60 |
| Functional GUI exercises | 13 |
| GUI interaction detectors | 13 |
| Independent state verifiers | 13 |
| Exercises gated on verified practice recovery material | 13 |
| Destructive exercises enabled | 0 |
| Exercises with live Cloudflare evidence | 0 |
| Blocked/incomplete exercises | 47 |

**S01-014 through S01-060 remain blocked.** The product preview features continue working, but their new exercise-specific verifiers are not yet implemented. Copy/move/rename/delete/restore/upload/download/archive exercise execution and state reconciliation are incomplete. The runtime does not claim that writing sixty definitions implements sixty tests. It does not offer working cleanup or protected-reference restoration yet.

## Safety limits and recovery

All ordinary exercise mutations, including multi-file operations and preparation/provisioning, are rejected at the existing universal API observer boundary while Test It is open or setup is settling. Pause retains the gate. Only a private, exact-input setup upload authorization bypasses it. Protected sources, backups, working objects, personal objects and mixed sets are all blocked as exercise mutation targets. No deletion exercise is enabled, including last-copy deletion.

This is an application-level gate, **not provider-enforced IAM separation**. Active credentials may still modify objects through other applications, tabs, or normal Explorer after X. Existing operations that started before Test It are not cancelled. No absolute data-loss guarantee is claimed. The shared adapter's existing upload implementation uses `.redown-beta-uploads/<uuid>/payload` staging outside the final practice namespace, then its existing safe final commit; staging failures can leave objects requiring reconciliation. No adapter or provider permission changes were introduced.

Recovery procedure in this version: stop dependent activities, export the evidence and retain protected material. Recheck saved practice to read every expected object and compare the original fixture hashes. A failed/uncertain preparation may be retried explicitly into a fresh namespace; earlier namespaces remain listed for review. Restoration of a new working copy from protected material is specified in S01-050 but is blocked until a verified scoped mutation implementation exists. Do not delete protected material as routine cleanup. Separate explicit approval and fresh verification are required for eventual protected-material removal.

## Verification

- Focused model/setup/real GUI fixture suite: **95 passed, 0 failed**. Final model/setup rerun after fail-closed persistence handling: **18 passed, 0 failed**.
- Full suite: **470 tests, 460 passed, 10 failed**. Clean starting commit with identical dependencies: **462 tests, 452 passed, the same 10 failure names**. No new failing test names. Frozen evidence hashes and assertions were not relaxed.
- Syntax, registry and issue inventory pass. Reliability remains failed on existing architecture freshness and baseline tests.
- Installed Chrome attempt: **BLOCKED, CHROME_NOT_AVAILABLE_ENOENT**, zero installed assertions executed. Browser interactions here are JSDOM through actual Explorer handlers and the existing embedded Worker with in-memory R2.
- Live R2: **NOT TESTED**, zero live writes, reads, deployments, repairs or provider acceptance claims.
- Safety tests cover occupied namespaces, corrupted/changed backups, fresh rechecks, distinct fixture identities, uncertain writes without replay, retained prior attempts/staging keys, rejection of forged saved identities, X before/after dispatch, protected and mixed-target guards, incorrect GUI actions, dependency blocking, partial exports and resumption.
- Window Preview, Side Preview, Lightbox, navigation/Refresh, ordinary file operations and Take the Tour remain covered by existing passing Beta tests. Production Legacy source and main were not modified.

Machine-readable evidence: [verification summary](verification/test-it-v2/validation-summary.json) and [local fixture export](verification/test-it-v2/sample-fixture-results.json).

## Exact changed files

- `docs/beta/REDOWN-COMPREHENSIVE-INTERACTION-TEST-MATRIX.json`
- `extension/beta/test-matrix.json`
- `extension/beta/test-it.mjs`
- `extension/beta/test-session.mjs`
- `extension/beta/test-practice.mjs` (new setup helper for the existing runtime)
- `extension/beta/explorer.mjs` (passes its existing navigation callback)
- `scripts/syntax-targets.json`
- `tests/beta-explorer.test.mjs`
- `tests/test-practice.test.mjs`
- `docs/beta/verification/test-it-v2/sample-fixture-results.json`
- `docs/beta/verification/test-it-v2/validation-summary.json`
- `docs/beta/HANDOFF.md`

## Clean replacement audit

Removed the old hard-coded target/ID map, first/second/return-bucket state, self-passing menu-open exercise, old 17-28 event mappings/comparators/menu verifiers, obsolete technical instruction cards and superseded Test It GUI tests. Fixed the old anonymous Tour-stop listener so teardown removes it. No second engine, API, cloud adapter or dependency was added. The setup helper is owned by the single existing Test It runtime and uses its observer/recorder. Historical handoffs and v1 evidence intentionally remain below/on disk for version traceability. The packaged master copy remains necessary because the extension cannot fetch repository docs; the drift test enforces one authoritative specification.

Next highest-value work: verify this consent/setup/navigation flow in an authorized installed Chrome/R2 session, then implement the remaining exercise verifiers and working-area mutations with full-set preflight, fresh protected recovery checks and identity-preserving readback reconciliation. Do not enable destructive tests simply to increase coverage counts.

---

# Test It partial-runtime handoff, October 27, 2026

Branch: **beta-explorer**. Base/specification: `f617d034168f88c6a15c0d5f24fc14c62aac7502`.
The delivery SHA is in the final response. Main and Legacy source were not modified.

**BUILT: coherent read-only subset. LOCALLY VERIFIED: JSDOM and in-memory provider fixtures. Installed Chrome and live Cloudflare R2: NOT VERIFIED. This is not the complete 60-exercise runtime.**

## Delivered behavior

- **☰ → Test It** uses the existing Tour guide's cards, positioning, highlights, accessible controls and X teardown. Take the Tour remains independent; starting either closes the other guide.
- The authoritative 60-definition matrix is unchanged. Its byte-identical packaged copy is checked against drift. Results are separate from definitions.
- All 60 records always export, including NOT_TESTED exercises never reached. Unsupported visited steps are BLOCKED. Explicit skips retain disposition `SKIPPED` and a sanitized reason while using NOT_TESTED rather than inventing a master-schema status.
- Back, gated Next, reasoned Skip, Pause/Resume, X, partial export, completed export and reload resumption are implemented. Pause retains the write gate; X releases it. No unrelated transfer is cancelled. Interrupted monotonic milestones reset on a new document while previous attempt evidence is retained.
- Direct listing/stat HTTP dispatch, headers, parsed response, status, provider error codes, sanitized diagnostics and network failures are instrumented. Background replies are explicitly **IPC**, with HTTP status null. They never impersonate provider responses.
- Navigation independently performs a fresh no-store provider listing, checks exact location, and compares returned keys against actual loaded Explorer rows. Local checks compare actual rendered DOM state after GUI actions. Next alone cannot pass a test.
- `performance.now()` and UTC milestones record action, request, visible DOM observation and verification. Missing timings are null. Local-only steps have no fictitious network timing. Request-to-processed and body-processing intervals are distinct; throughput is null because no Test It transfers are enabled.
- Export projects diagnostic fields rather than serializing arbitrary payloads. Account/bucket/object identifiers, tokens, URLs, profiles and file contents are excluded. Raw snapshots remain in memory only.

## Exact coverage

| Capability | Implemented | Locally exercised | Live verified |
|---|---:|---:|---:|
| Executable exercise verifiers | 20 | 20 | 0 |
| GUI event capture | 20 | 20, synthetic events through actual GUI handlers | 0 |
| Direct HTTP response capture | 7 navigation exercises | 7, provider fixtures | 0 |
| Independent state verifiers | 20 | 19 pass; 1 correctly detects existing GUI failure | 0 |
| Latency instrumentation | 20 | 20; network milestones only for navigation | 0 |
| Remaining unimplemented exercise verifiers | 40 | explicitly BLOCKED when visited | 0 |

Executable IDs: **S01-001, S01-009 through S01-015, S01-017 through S01-028**.

S01-027 correctly fails when a prior file selection causes the empty-area context menu to retain file-specific commands. The real product behavior was not changed to make the test green. Every other implemented verifier passes the corresponding local fixture. A green code test for this failure detector is not a passed product exercise.

## Safety and implementation gaps

This build does **not** implement disposable-scope approval, fixture hashing/inventory, fixture ownership transactions, cloud mutation exercises, mutation readback/SHA-256, disk download verification, media rendering acceptance, clipboard lifecycle, archives, cleanup verification or future sessions. Those exercises remain blocked instead of simulated. There are no Test It-created cloud objects to clean up.

All universal-API cloud writes, including provisioning and extraction, are blocked before dispatch while Test It is active or paused. Public URL popover access is also blocked because it can enable public access outside this API. Exit with X to resume ordinary Explorer operations. Previously running operations are not cancelled, adopted as test-owned, or claimed verified.

Transport limitations: only direct listing/stat HTTP is instrumented; background provider subrequests and internal HTTP retry attempts are unavailable. IPC final responses/errors preserve application evidence but cannot meet raw-provider proof. No Cloudflare internal execution time is inferred. T4 is DOM observation on an animation frame, not a physical-paint measurement. Session resumption does not reconstruct private first-bucket identity; dependent comparisons are blocked rather than guessing.

Next work: implement explicit approved account/bucket/prefix plus fixture ownership and hashes; then add bounded independent mutation verification before enabling any mutation exercises. Add rendered preview, download disk readback and background per-request evidence without modifying Legacy. Complete owner-approved installed Chrome/live-R2 acceptance separately.

## Verification

- Focused `node --test tests/test-it.test.mjs tests/beta-explorer.test.mjs`: **87 pass, 0 fail**. Final latency-model check: **10 pass, 0 fail**.
- Full regression through `npm run reliability:check`: **462 total, 452 pass, 10 fail**.
- Fresh checkout of the starting commit: **445 total, 435 pass, the same 10 failures**. Failure names were compared; no new failure names relative to that base. The reliability classifier calls three of these “new” relative to its older seven-failure ledger; all three also fail in the fresh starting checkout.
- Syntax, API registry and issue inventory pass. Architecture freshness fails on the starting checkout and current branch. Frozen historical hashes were not refreshed.
- Draft 2020-12 JSON Schema validates the sample, all 60 unique IDs and allowed status/version values. Validator: jsonschema 4.26.0, installed only in temporary tooling.
- Existing Tour, previews, listing, uploads, downloads, Worker and transfer fixture tests remain in the full suite. No installed Chrome, native disk readback, real credentials, live R2 mutation, deployment or release certification was attempted.

Evidence: [validation summary](verification/test-it/validation-summary.json), [focused log](verification/test-it/focused.log), [baseline log](verification/test-it/baseline.log), [reliability log](verification/test-it/reliability.log), [sample export](verification/test-it/sample-fixture-results.json), [results schema](test-it-results.schema.json).

The sample export contains **explicitly labeled local JSDOM/in-memory provider evidence**, with actual measured fixture timings. It is not a fabricated live session. It shows menu startup and one independently checked bucket listing; remaining records retain their actual untouched/blocked statuses.

## Files

Runtime: `extension/beta/test-it.mjs`, `test-session.mjs`, packaged `test-matrix.json`; integration in `explorer.mjs` and `explorer.html`; optional guide hooks in `guided-interaction.mjs`; passive API/transport hooks in `file-api.mjs` and `r2-adapter.mjs`; internal instrumentation option forwarding in `configuration.mjs`.

Validation: `tests/test-it.test.mjs`, expanded actual-GUI harness/tests in `tests/beta-explorer.test.mjs`, `scripts/syntax-targets.json`, `docs/beta/test-it-results.schema.json`, and `docs/beta/verification/test-it/*`.

---

# Previous handoff (historical; current coverage is above)

# Take the Tour handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `080881a166a8cd7c347be41795c57c2ebd22d6f2`.
The pushed delivery commit includes this handoff; its SHA appears in the delivery response.

**BUILT and LOCALLY TESTED with fixtures. Rendered Chrome and live R2 acceptance remain UNVERIFIED.**

## Delivered

- Header **☰ Explorer menu → Take the Tour** starts or cleanly restarts the walkthrough. The menu closes on launch, outside click or menu Escape. Connection is not required.
- A small optional first-visit welcome offers **Take the Tour**, **Not Now** and X. Dismissal/start and completion are remembered under `betaExplorerTour`; completion includes a timestamp. No file data, auth information or unfinished-step position is persisted. No automatic resume.
- Fifteen cards cover welcome, connection, accounts, bucket opening, files/folders, selection, sort/views, Refresh, operations, transfers, preview modes, preview controls/lightbox, destinations/TRUE REMOTE, preferences/help and completion.
- Five exercises unlock Next only after the relevant existing handler reports an action: successful bucket-root navigation, actual file selection, changed List/Grid view, successful Refresh and supported preview creation/presentation. An ordinary unrelated click does not complete an exercise. Every exercise has **Skip**, including disconnected/empty/error cases. These signals are tutorial acknowledgements, not diagnostic/provider verification.
- **Every card has X. X ends the entire tour immediately**, without confirmation, follow-up or restart. Exit removes the card/highlight, disconnects the observer, unregisters tour listeners and cancels pending animation-frame positioning. It leaves Explorer selection, session, files and preview state alone. Back, Next, Skip and Finish share this lifecycle. Escape exits only from tour focus; it does not cancel an underlying native dialog. Focus returns to a valid prior target or the menu/active dialog.
- Crimson outlines and compact nonmodal cards keep the real controls operable. Positioning prefers space beside/above/below targets, clamps to the viewport, reacts to scroll/resize/DOM changes, and moves the card inside an active dialog so native modality does not make the tour inert. Large surfaces and constrained windows use a clamped corner fallback; pixel-level overlap acceptance remains outstanding.
- `guided-interaction.mjs` is the reusable presentation/navigation lifecycle; `tour.mjs` owns tour content, invitation, persistence and menu. Application-local action signals contain only action names. **Test It, diagnostic logging, JSON exports, exercise generation and cloud mutation automation were not implemented.**

## Files changed

`extension/beta/guided-interaction.mjs`, `extension/beta/tour.mjs`, `extension/beta/explorer.html`, `extension/beta/explorer.css`, `extension/beta/explorer.mjs`, `tests/beta-explorer.test.mjs`, `scripts/syntax-targets.json`, `docs/beta/HANDOFF.md`.

## Verification and limits

- Focused Beta/API/auth/reconnect/copy command: **104 passed, 0 failed**, including **70 Beta tests**. Five new fixture tests cover invitation persistence, menu/restart, X on all 15 steps, Back/Next/Skip, intended-action recognition, disconnected/no-bucket navigation, completion, Escape with preview preserved, no unsolicited file mutations, and narrow viewport coordinate bounds.
- Full `npm test`: **445 tests, 435 passed, 10 failed**. Clean starting-commit archive with the same dependencies: **440 tests, 430 passed, 10 failed**. The ten failure names match the baseline; no frozen evidence or assertions were relaxed.
- Syntax checks include both new modules and pass. `npm run reliability:check` remains failed for pre-existing architecture freshness and full-suite baseline failures.
- Playwright launch: **BLOCKED**, Chromium executable absent. jsdom viewport assertions do not prove rendered geometry, native hit targets, actual focus behavior or screen-reader output. Desktop/laptop/narrow visual acceptance remains to be performed.
- **Live Cloudflare R2: NOT TESTED.** Tutorial exercises use existing user-invoked browsing/preview reads; the tour initiates no provisioning, authentication, upload, download or destructive action. Preview recognition is not evidence of browser decoding or provider acceptance.
- Existing Window/Side Preview and file-selection/context-menu regressions pass. Main, Legacy, Worker provisioning, authentication, transfer limits and API contracts remain unchanged.

Next acceptance: in installed Chrome, accept/decline the invitation, restart through ☰, exercise available reads, exit with X at different steps and from Preview, then verify desktop/narrow card placement and ordinary Explorer interaction. Earlier handoffs below are historical.

---

# Window navigation and image lightbox, October 27, 2026

Branch: **beta-explorer**. Starting commit: `ee63a0904a0eaec3dcf4becf9d40f04c6cd66c0c`.
The delivery commit includes this handoff; its SHA is supplied in the delivery response.

**Implemented and locally tested with fixtures. Browser rendering, installed Chrome and live R2 remain UNVERIFIED.**

- Window Left/Right and existing Previous/Next follow the visible sort/filter, skip folders and unsupported formats, and stop at boundaries. Opening focuses the dialog, so arrows work immediately. Editable/media controls retain their keys; underlying Explorer shortcuts stay behind the modal and resume after closing.
- A square **Open image lightbox** button sits immediately left of X, hidden for non-images and Side Preview, disabled while an image is unavailable.
- Lightbox uses the same dialog, image node and object URL. Its viewport-sized dark presentation hides the header, metadata, controls and borders. Intrinsic image sizing with viewport maxima preserves aspect ratio, avoids unnecessary small-image enlargement and fits without cropping or ordinary scrollbars. No Fullscreen permission or additional read is needed to enter/exit.
- Lightbox arrows traverse images only. First Escape or backdrop click returns to ordinary Window Preview with the current image; second Escape closes. Image clicks do not exit. Native dialog cancellation is handled separately. Loading stays dark; a failed/corrupt image returns to the ordinary error view.
- Existing cancellation/generation checks, bounded reads, media unloading and URL cleanup remain shared. Rapid navigation invalidates old reads and revokes late URLs. Bucket/account/folder/session changes invalidate the same preview. Side mode persistence, resize, minimize, expand, selection updates and formats remain intact.

Changed files: `extension/beta/explorer.html`, `extension/beta/explorer.css`, `extension/beta/explorer.mjs`, `tests/beta-explorer.test.mjs`, `docs/beta/HANDOFF.md`. Main, Legacy, authentication and the universal API were not modified.

## Verification

- Focused Beta/auth/API/copy regressions: **99 passed, 0 failed**, including **65 Beta tests**. Three added interaction regressions cover ordering/filter/boundaries/editable controls/focus, lightbox node/URL reuse and exits, and rapid delayed responses/abort/URL cleanup. Existing dual-mode and file-operation regressions pass.
- Full `npm test`: **440 tests, 430 passed, 10 failed**. Clean starting-commit archive using the same dependencies: **437 tests, 427 passed, 10 failed**. Failure names match the existing ten recorded below; no assertions or frozen hashes were relaxed.
- Syntax, registry validation and issue inventory pass. `npm run reliability:check` remains failed for existing architecture freshness and baseline failures.
- Playwright launch attempted: **BLOCKED**, Chromium executable absent. No desktop/narrow rendering, landscape/portrait/small/wide image decoding, native Chrome focus/keyboard behavior, PDF/codec playback or installed-extension claims are made from jsdom fixtures.
- Live Cloudflare R2: **NOT TESTED**. No cloud mutation, provisioning, deployment or release promotion.

Remaining acceptance: run the requested image shapes and desktop/narrow layouts in installed Chrome against authorized R2 files; verify actual decoding, backdrop hit targets, two-level Escape and immediate keyboard focus. Embedded PDF viewers can own keyboard events inside their document; native browser handling still needs acceptance. Navigation covers currently loaded, filtered entries, without fetching more pages. Earlier handoffs below are historical.

---

# Dual-mode Preview handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `f6f4713d0adeb837ce83773d4f9388f33a26e9a7`.
The delivery commit includes this handoff and verification JSON. Its SHA is in the delivery response and resolves at the branch head.

**BUILT and LOCALLY TESTED with fixtures. Rendered-browser, installed-Chrome and live-R2 acceptance remain UNVERIFIED.** This section supersedes historical statements below that docked preview is deferred. The bucket navigation and Refresh fixes remain present. Main, Legacy, authentication, adapter/API contracts and production defaults are unchanged.

## Exact files changed

- `extension/beta/explorer.html`: Preview mode selector, dock host, accessible divider, shared viewer and pane controls. An inline selector also allows switching out of the modal without closing the loaded viewer.
- `extension/beta/explorer.css`: crimson/white dock layout, constrained list/pane widths, compact minimized header, full-height expansion, container-responsive rows and stacked narrow-window layout.
- `extension/beta/explorer.mjs`: shared viewer presentation, persistent mode/width, selection-driven reads, independent cancellation/generation checks, metadata/fallbacks and cleanup.
- `tests/beta-explorer.test.mjs`: ten additional local interaction/lifecycle regressions; the original preview assertion now waits for the loaded text because the dialog visibly opens during loading.
- `scripts/beta-explorer-preview.mjs`: extended normal-webpage Playwright fixture for image decoding, mode switches, pane controls, actual pointer drag and four viewport widths. **Prepared, syntax checked, but browser execution BLOCKED.**
- `docs/beta/HANDOFF.md` and `docs/beta/DUAL_PREVIEW_VERIFICATION-2026-10-27.json`: scope, results, remaining acceptance and unchanged baseline failures.

## Implemented behavior and fixture verification

**Window Preview** remains the default. Toolbar Preview, supported-file double-click and context-menu Preview use the chosen mode. The original image, PDF iframe, safe text/code, video/audio controls, metadata and previous/next paths remain in one shared renderer. Loading is visible inside the preview; failures stay inside it and offer Download. This is DOM/API fixture verification, not browser PDF decoding or codec playback proof.

**Side Preview** uses the same viewer DOM, object URL and universal API operation. Selecting a different file updates the pane without locking navigation or file operations. Selection of a folder shows its prefix; unsupported files show metadata and Download without attempting an unsupported preview read. Multiple/empty selection shows an appropriate placeholder. Closed panes stay closed until Preview is used again.

Mode and preferred width persist under `betaExplorerPreview` in local extension storage. Switching modes moves the existing loaded viewer and does not reread the object. The selector remains available inside the modal. Minimize pauses media and retains the current DOM/URL; Preview restores it without another read if selection/content is unchanged. Close stops/unloads media, releases the URL and returns space to the list; reopening rereads intentionally because closed content was released. Expand/restore changes the workspace viewing height and retains width. The divider uses pointer capture and also supports arrows/Home/End; normal bounds leave at least 280px for each area and cap preferred pane width at 720px.

At viewport widths up to 1150px, the pane stacks below a scrollable file list rather than squeezing rows; horizontal resizing is intentionally hidden there. Expanded narrow preview scrolls into view at viewport height. Desktop expanded mode preserves both the list and divider. These layout rules are implemented; actual desktop/laptop/narrow rendering and hit-target acceptance still need a browser.

Preview requests use their own AbortController and generation, independent of mutation busy state. Obsolete successes/failures cannot repaint a different selection, and late URLs are revoked. Bucket/account/folder changes, deleted selections, auth invalidation and page exit invalidate preview state. Shared API memory budgets, bounded reads and explicit text truncation remain unchanged. Corrupt image/media error events produce an inline fallback. Browser PDF-plugin errors may not dispatch an iframe error event, so native PDF error UI is still possible.

## Verification

**Focused: 96 passed, 0 failed (62 Beta tests). Full suite: 437 tests, 427 passed, 10 failed. Starting commit: 427 tests, 417 passed, the same 10 failure names.** Verification details are recorded in `DUAL_PREVIEW_VERIFICATION-2026-10-27.json`.

- Focused command: `node --test tests/beta-explorer.test.mjs tests/cloudflare-api.test.mjs tests/cloudflare-login.test.mjs tests/cloudflare-reconnect.test.mjs tests/explorer-copy.test.mjs`.
- Full suite is exercised by `npm run reliability:check`, using the repository's existing test reporter. Syntax, registry and issue checks are included. The gate remains failed for existing architecture freshness and baseline failures; no frozen hashes, assertions or allowlists were relaxed.
- Starting commit was extracted with `git archive` and tested with the same installed dependencies to compare failure names independently.
- Browser fixture command: `REDOWN_PLAYWRIGHT_MODULE=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node scripts/beta-explorer-preview.mjs`.
- Browser fixture is **BLOCKED before any assertions**: Playwright Chromium executable absent. Browser installation was attempted; download returned invalid/truncated archives. No rendering, viewport, pixel, native drag or codec pass is claimed.
- `node scripts/installed-chrome.mjs extension /tmp/redown-dual-chrome.json`: **BLOCKED**, `CHROME_NOT_AVAILABLE_ENOENT`; zero installed assertions.
- Live R2: **NOT TESTED**. No authenticated installed extension/provider context was available. No live cloud writes, provisioning, repair or deployment occurred.

Local tests cover both mode render paths, no-reread switching, saved settings, side selection, context Preview, double-click, previous/next, minimize/reopen, close/reopen, expand/restore, divider handler bounds/persistence and keyboard control, obsolete reads/failures, URL cleanup/media unloading, explicit truncation, failed/corrupt/unsupported previews, bucket/logout invalidation, and file operations/Refresh/deleted-selection pruning with a pane open. Existing bucket A/B/A, auth, API, large-transfer and Worker operation tests remain included.

## Remaining acceptance and highest-value next task

**Run the installed Chrome/live-R2 dual-preview acceptance below before declaring Milestone 2 complete.** Reuse the owner's existing signed-in extension, without changing production defaults.

1. Open a real R2 image in Window Preview using Preview, double-click and context Preview. Verify actual pixels, metadata, loading, previous/next and close/Escape.
2. Switch to Side Preview inside the modal. Verify it docks and preserves the loaded content without another object GET. Select another image; rapidly alternate files and buckets and confirm no stale content.
3. Minimize, then reopen with Preview; close, then reopen again. Expand/restore. Drag the divider and try its keyboard controls. Reopen Beta and confirm selected mode/width persistence. Check a changed selection while minimized.
4. Exercise actual PDF, text/code including truncated large text, video and audio. Confirm playback stops on selection change/minimize/close. Include damaged and unsupported files; check inline metadata/Download and budget failures without navigation disruption.
5. Test 1440px desktop, 1024px laptop, 768px and 390px narrow windows. Verify scrolling, list readability, side stacking, full-height expansion, file context menu and controls. The prepared Playwright fixture covers these widths once Chromium is available.
6. Repeat 1234 → 12345 → 1234 and Refresh within a folder. Confirm previews clear on bucket changes and file operations still work. Use a separately approved disposable prefix for live writes; independently verify bytes when testing transfers.

No local regression failure was introduced relative to the starting commit. Actual browser layout/playback and live R2 behavior are outstanding limitations, not passes. Exhaustive parity, Guided Testing, S3 expansion, multipart transfers and release promotion remain outside this change.

---

# Bucket navigation and Refresh handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `266a391bf4be6ea82b007bbe87632042272a59df`.
The delivery commit contains this handoff; obtain its exact SHA with `git rev-parse HEAD` or the delivery response.

**BUILT and LOCALLY TESTED. Installed-Chrome/live-R2 acceptance remains UNVERIFIED.**
This update supersedes the Refresh behavior described in the historical handoff below.
Legacy remains the unchanged default, and main was not modified.

## Exact files changed

- `extension/beta/explorer.mjs`: bucket/account navigation state, stale-response protection, same-location Refresh, error classification and stale-list interaction guards.
- `extension/beta/r2-adapter.mjs`: Legacy-compatible response envelopes, provider error details/redaction and continuation-token validation.
- `tests/beta-explorer.test.mjs`: eight additional regression tests and updated Refresh expectations; a small fixture hook captures API download routing.
- `docs/beta/HANDOFF.md`: this delivery record.

## Fixes and Legacy comparison

The empty-cursor correction `266a391` is the starting HEAD and remains present: the first request omits `cursor`; subsequent pages preserve opaque returned tokens. The existing 1,000-object page size and pagination workflow were not changed.

Legacy `background.js:listObjectsPage` conditionally includes prefix/cursor/delimiter, accepts array/nested/top-level object envelopes and reads folders/cursors from result or result_info. Beta now follows that parsing behavior, including top-level objects it previously rejected. Provider failures now retain HTTP status plus Cloudflare code/message, so 10023 is visible rather than hidden behind a generic HTTP 400. Bearer values, URL strings and labeled credentials are redacted from provider error messages.

Legacy `options.js:browseWorkspace` snapshots the location and rejects stale generations. Beta retains its existing listing epoch and now also prevents superseded navigation from saving its location or changing completion feedback. Buckets remain clickable during a read, allowing a newer choice to take precedence. Account changes immediately invalidate the previous listing and clear old sidebar controls. History navigation paints the correct account and bucket sidebar. Clicking a bucket clears the previous rows, selection, filter and continuation token before loading its root.

Legacy bucket tiles ultimately select a target and call `goLocation`; their circular repair targets also perform explicit preparation. Beta adapts the target/context and generation behavior, while leaving Worker provisioning behind the existing explicitly confirmed setup action. No Legacy source was edited, and provisioning is not a prerequisite for browsing.

The single top Refresh now reads the current account/bucket/prefix directly through the existing universal API. It retains history, clipboard, filter and surviving selections, updates metadata, removes vanished selections and clears the attention indicator after success. It does not enumerate accounts/buckets or probe Worker readiness for an ordinary successful reload. No current selection triggers discovery; HTTP 401/404 during refresh triggers recovery discovery. Other failures retain the location and actionable errors. Missing Worker setup continues to block mutations honestly, while successful browsing can clear the listing attention indicator. Failed/loading listings block stale-row file interactions.

An added expired-auth test also exposed an existing classification bug: “Reconnect Cloudflare” matched the old disconnected regex before the HTTP 401/expired-auth check. Authorization errors now retain the proper authorization state.

## Actual verification

- Focused command: `node --test tests/beta-explorer.test.mjs tests/cloudflare-api.test.mjs tests/cloudflare-login.test.mjs tests/cloudflare-reconnect.test.mjs tests/explorer-copy.test.mjs`: **86 passed, 0 failed**, including **52 Beta tests**.
- Final full `npm test`: **427 tests, 417 passed, 10 failed**.
- Clean starting-commit archive with the same installed dependencies: **419 tests, 409 passed, 10 failed**. Failure names match exactly; no new failure names.
- Syntax, API registry and issue inventory pass. `npm run reliability:check` remains failed because architecture freshness and the existing full-suite failures are not release-green. Frozen hashes/assertions/allowlists were not changed.
- Installed-Chrome attempt: `node scripts/installed-chrome.mjs extension /tmp/redown-chrome.json`: **BLOCKED**, `CHROME_NOT_AVAILABLE_ENOENT`; zero installed assertions executed.
- Live R2: **NOT TESTED**. No authenticated installed-extension context or live R2 credential was available to this checkout. No cloud mutation, repair or deployment was performed.

New local GUI/adapter coverage includes distinct 1234/12345 object sets, A/B/A switching, folder refresh, history after refresh, selection and context-menu Download routing, delayed success/failure isolation, actual fixture-empty results, HTTP 400/403/401, network failure, expired-auth recovery, session invalidation during a read, metadata replacement/deleted selections, and all three Legacy listing envelopes with opaque continuation tokens. Existing local fixture operation tests still exercise uploads, copy/move/rename/delete and the embedded production Worker. These are fixtures, not installed/provider proof.

The ten unchanged full-suite failure names are:

1. offline discovery advertises only implemented operations and distinct versions
2. catalog IDs, evidence labels, source hashes and references are internally consistent
3. real discovery, case, history, filters and validation are deterministic and honest
4. original case and proposal Markdown bytes are retained from pinned upstream
5. current architecture references resolve and imported CLI operates outside checkout without executing arbitrary input
6. explicit labels are recorded as partly addressed while the omitted-item report stays open
7. Nested drag-handle keyboard move saves sibling order with descendants and paths intact
8. successful provisioning refreshes destination editors and inventory before reporting ready
9. real vertical contract resolves intent, three upload invariants, handlers, current source and regression
10. full finite public coverage inventory resolves strata and all canonical case links

## Remaining limitations and next action

The owner's live incident is not independently reproduced or certified fixed here. Reuse the existing signed-in Chrome installation to open 1234, 12345, then 1234; confirm the provider's actual contents each time. Open a nested folder and Refresh, confirm the path and metadata remain correct, then select a real file and check its context operations. Exercise a valid paginated bucket and an empty bucket. Record exact provider errors if any remain. Use a separately approved disposable prefix for write-operation acceptance.

That installed-Chrome/live-R2 navigation test is the highest-priority next action. No exhaustive parity audit, Guided Testing, Preview pane, provider expansion or release promotion was started. Existing direct-upload limits and unfinished folder-download/durable-recovery capabilities remain as described below.

---

# Beta Explorer handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `44f8505648b9b1008d93999a17ce3efbe9627a67`.

**Implementation commit: `9c06ce16896fd69e5ba9e177964501e1010cf218`.** The subsequent documentation commit contains this handoff and the verification record. Its final delivery SHA is provided in the delivery message and resolves through the branch head.

Status: **BUILT and LOCALLY TESTED. Milestone 1 live acceptance is UNVERIFIED.** No release, default-interface change, main update, deployment or live cloud mutation was performed. Original Explorer remains the default. This session implements the immediate roadmap, not the later parity inventory, Guided Testing system or docked Preview pane.

## What works in local product-path tests

- Existing shared Cloudflare authentication is reused. Beta discovers accounts and buckets automatically, including accounts beyond the first. A sole accessible bucket opens immediately; multiple buckets appear as direct sidebar choices.
- Successfully visited bucket/folder locations persist under `betaExplorerLocation`. Startup validates bucket accessibility before restoration. Removed saved folders fall back to the live bucket root; inaccessible saved buckets do not block available choices.
- The existing adapter lists actual Cloudflare REST objects when used in an authenticated installed extension. No simulated objects or new file engine were added to the product.
- Existing GUI selection, multi-selection, folder double-click, supported preview, clipboard, duplicate, rename, copy/move destinations, delete, upload, folder upload, dropped files/folders, download, properties, navigation/history/breadcrumbs, sort/filter and keyboard paths remain routed through the same universal API.
- A new GUI-driven 51 MiB fixture test uploads a File, checks stored bytes independently with SHA-256, renames, duplicates, cuts/pastes into a nested folder, checks bytes again, receives simulated Chrome download completion, and deletes the disposable copy. The original stays intact.
- Context menus omit unavailable commands. Unsupported preview formats offer Download; double-click downloads those files instead of advertising a nonexistent inline viewer. Existing ZIP/CBZ and supported preview behavior is preserved.
- Mutations refresh the visible list and retain their outcome message. Listing/loading/empty/disconnected/authorization/failure states are distinct; failed folder reads do not masquerade as empty folders.

## Intelligent Refresh and explicit setup

Refresh remains usable without a selected bucket. It refreshes live account/bucket discovery, restores a still-accessible location, reloads file contents, and reads Worker capabilities for the selected bucket. It identifies partial account discovery, auth/listing and Worker readiness failures. An outlined attention state points to intervention.

Browsing needs no Worker initialization. File changes require a ready safe-transfer Worker. Missing or obsolete setup produces an actionable message pointing to the existing **Set up right-click destination** button. That button still requires explicit confirmation and invokes the original provisioning service. Original advanced settings and Simple/Nested menu configuration remain available through the sidebar link.

`connectionStatus` is one additional read operation on the existing API. It reads saved profiles internally, checks the production Worker capabilities contract, and returns only readiness/reason, never credentials.

A small additive background-service change honors Beta's `betaNoProvision` flag. Beta copy/move/rename/delete/mkdir, archive operations and TRUE REMOTE refuse implicit Worker provisioning. A Worker 401 after readiness does not trigger repair/replay for these Beta calls. **Legacy calls omit the flag and retain their existing defaults.** This shared-file change is necessary to enforce the requested infrastructure safety boundary, not a replacement transfer implementation.

## Verification

| Check | Result | Evidence scope |
| --- | --- | --- |
| Beta tests | 45 passed, 0 failed | jsdom GUI and provider/Worker fixtures |
| Focused Beta, copy, Worker, auth/session/reconnect tests | 109 passed, 0 failed | local fixtures |
| Full suite | 419 tests: 409 passed, 10 failed | local repository |
| Starting-commit full suite | 408 tests: 398 passed, same 10 failure names | clean git-archive baseline, same dependencies |
| Syntax, API registry, issue inventory | passed | local checks |
| Architecture/reliability gate | failed | architecture already partial on baseline; stored allowlist recognizes only 7 of the 10 baseline test failures |
| Installed extension | BLOCKED | `CHROME_NOT_AVAILABLE_ENOENT`, no Chrome executable |
| Live R2 and original installed Chrome TRUE REMOTE | UNVERIFIED | no authenticated installed extension or approved disposable namespace available |

The full suite is **not green**. No failing assertions, frozen historical hashes or regression allowlists were relaxed. Exact failure names, scoped commands, source SHA-256 values and the blocked Chrome attempt are recorded in [MILESTONE1-VERIFICATION-2026-10-27.json](MILESTONE1-VERIFICATION-2026-10-27.json).

The local fixture exercises the actual embedded production Worker. It does not prove Cloudflare permissions, installed-extension UI behavior, downloaded disk contents or production memory use. Chrome downloads are simulated. No live access, deployment or live SHA-256 pass is claimed.

## Remaining work and restrictions

- Owner-installed Chrome must demonstrate login/discovery, real files, navigation and the full disposable-object lifecycle. This is the outstanding Milestone 1 exit gate.
- Existing direct local-upload route still limits files to **300,000,000 bytes**. Existing Worker TRUE REMOTE limits/deadlines remain in force. No multipart or unrestricted-size claim is made; pagination is unchanged.
- Folder downloads, preserving empty dropped directories and durable transfer recovery remain incomplete. Filtering covers loaded items; it is not a new recursive search implementation.
- A saved empty R2 folder is recognized through its existing marker objects. R2 has no native empty directories.
- Full Legacy-versus-Beta parity, the complete right-side Preview pane and Guided Testing remain deferred.

## Owner action and next highest-value task

Load this branch in an approved Chrome extension environment and use the existing Cloudflare login. Beta should open the last accessible location or sole bucket automatically. If writes need setup, confirm the existing destination setup button for the intended bucket.

Use an explicitly disposable prefix in an owner-approved R2 bucket. Upload the existing 51 MiB case, independently download/read it and compare SHA-256, then rename, duplicate, move to a nested folder, download and compare again, delete only the disposable objects, and Refresh to confirm provider state. Separately exercise the original Chrome right-click TRUE REMOTE path with an approved URL. Capture actual errors if anything fails.

**Next highest-value task:** execute that installed-Chrome/live-R2 acceptance workflow and fix any observed product-path failures before beginning Milestone 2. The implementation is not promoted to the default.

Publication uses the connected GitHub Git-data API because terminal push lacks credentials. Updates use an expected-head lease, without force. Local and published Git trees are compared before delivery.
