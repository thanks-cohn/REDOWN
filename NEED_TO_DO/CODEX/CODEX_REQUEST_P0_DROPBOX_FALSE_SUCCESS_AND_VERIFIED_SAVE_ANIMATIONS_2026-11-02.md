# CODEX WORK REQUEST — P0 Dropbox false-success repair + verified-save SUCCESS! choreography

**Date:** 2026-11-02  
**Repository:** thanks-cohn/REDOWN  
**Required branch:** codex/v3-parity-first-reconstruction  
**Priority:** P0 integrity / truth of saves first; P1/P2 scoped aesthetic follow-up  
**Status:** OPEN IMPLEMENTATION REQUEST. Nothing in this document is evidence that the code was repaired, an upload occurred, or a live browser test passed.

## 0. Operator mandate and order of work

**Implement, test, document, commit and push on the required working branch. Do not merge into main.**

First fix Dropbox's false success and diagnose the actual destination/session; second make the theme-specific SUCCESS! effects consume *only* an authoritative verified-success event. This is one bounded implementation task because card counters, History, provider receipts and celebration timing must share the same definition of success.

Read AGENTS.md and the current diagnostic/runbook instructions before changes. Preserve and compare protected V3, Boot, provider menu and Cloudflare routes. Investigate actual current source, not just older reports. Preserve all existing credentials and owner History. Never destroy/reinitialize user storage to make tests pass.

This request is the **latest owner authority for SUCCESS! animation choreography**, superseding conflicting animation wording in NEED_TO_DO/CODEX/CODEX_REQUEST_P1_ALL_CLOUD_SAVE_IMPACT_AND_THEME_SUCCESS_2026-11-02.md. That older request's *separate save-impact pulse* and *working falling ball* requirements remain intact; do **not** conflate the impact pulse (a dispatch visual) with proof of remote upload.

## 1. Owner-reported P0 incident (not independently reproduced here)

Observed installed behavior:

1. The native REDOWN right-click menu offers a Dropbox action and permits clicking it.
2. The corresponding Dropbox card still says **Login**, rather than visibly connected.
3. After attempting the native save, the Dropbox card's successful-save number increases by **+1**.
4. History creates an entry that appears to represent a successful save.
5. The intended file **does not appear in the owner's Dropbox**.

Treat this as a suspected **silent data loss / false-positive successful transfer** incident, not an established provider upload outcome. The card may be stale, the menu may be stale, or completion may be recorded prematurely. Determine which is true from evidence rather than assuming.

Investigate this alongside the existing November 1 critical Dropbox namespace/reconnect/missing-file incident at bugs/CRITICAL/2026-11-01_P0_DROPBOX_RECONNECT_NAMESPACE_REJECTION_AND_MISSING_SAVED_FILES.md. Do not assume the root cause is identical.

## 2. P0 investigation: end-to-end forensic trace

Trace a single stable job ID all the way through:

**native click → provider ID dispatch → account/namespace/authorized root → source bytes → Dropbox upload/session commit → definitive provider response and metadata readback where supported → terminal job receipt → History record → correct provider counter → card animation.**

Inspect actual source entrypoints and ownership, including as applicable:
- extension/background.js, shared native click dispatcher/menu registration, V3 context menu interfaces and worker lifecycle.
- extension/dropbox-auth.js, dropbox-provider.js, dropbox-api.js, shelf-dropbox.js, Dropbox token-refresh and root/namespace verification.
- extension/history-archive.js, transfer-counter.js, shelf.js, shelf.css, shelf.html, shelf-odometer.js and event fanout.
- persistent Dropbox job/transfer records, completion flags, storage.onChanged messages, and existing tests.

For both normal and failing cases, determine exactly **which code sets successful state, inserts History, increments per-provider and global counters, and publishes the completion animation**, including whether an optimistic/pending signal is misinterpreted as success. Audit overwritten/replayed transfer notifications, retries, service-worker restarts, stale menu IDs, account swaps, namespace changes, and errors lost in background-to-Shelf RPC.

Preserve REDOWN data. Before any destructive remediation, capture sanitized local evidence sufficient to distinguish genuine success, failure, and uncertain remote commit. Never put tokens, private source URLs, user file contents, or sensitive Dropbox paths in public logs.

## 3. P0 required behavioral repair

### 3.1 Authoritative success contract

A transfer is **successful** only after Dropbox acknowledges final remote commit for the intended authorized account/root/path, with conclusive response metadata and readback when supported/appropriate. For an upload session, starting or appending chunks is *not* final success. A right-click, source fetch, queue insertion, positive HTTP status on an intermediate operation, or animation kickoff is *not* success.

Use stable job/operation IDs and an idempotent, provider-attributed completion/receipt boundary. Ensure a verified save contributes **exactly one** success to the correct provider card and cumulative odometer even through retries, duplicate events, worker revival, Shelf reopening, and concurrent saves. Keep a pending/uncertain state when commit outcome is ambiguous; reconcile using non-destructive remote ID/path evidence before retrying. Avoid duplicate cloud objects from unsafe automatic retries; preserve KEEP BOTH/autorename behavior.

### 3.2 Authentication and native menu consistency

Make Shelf's Login/Connected/Reconnect state accurately reflect current verified Dropbox connection and authorized destination. The native menu must not imply an authenticated successful-save destination when only login/reconnect is available. Investigate whether the menu action is a login entry, a stale actionable destination, or a valid save whose Shelf status is stale. Preserve intentional click-to-login behavior for disconnected users where supported, but login itself cannot generate a successful save receipt. Never silently navigate to Home/Dashboard instead of routing or reporting the attempted save.

Expired/revoked token, root mismatch, team namespace, missing scopes, ambiguous destination, quota, 401/409/429/5xx, canceled flow, unavailable file and network timeout all require truthful statuses. Do not automatically broaden scopes, force repeat approval during a healthy session, silently switch account/root, or create an unwanted cloud folder.

### 3.3 Honest History and GO TO

Record attempts as attempts; distinguish queued/in-progress, verified successful, failed/blocked/canceled and uncertain/interrupted terminal or recoverable states. Keep original page/source/frame/link provenance within REDOWN's own History where already supported; DO NOT send it to Dropbox. Only proven successful entries qualify for successful GO TO or a verified destination link. Do not fabricate Dropbox links from basename alone. Preserve failed attempts for investigation; do not erase, backfill or reclassify old History without proof. If old counts appear inflated, report a safe reconciliation proposal and evidence first; never silently rewrite the cumulative lifetime count.

### 3.4 Dropbox data minimization

Dropbox receives only the file bytes, selected destination path/name with real extension, necessary minimal metadata and normal API/auth inputs. No REDOWN-origin provenance, source/page/link/frame URLs, or unrelated browsing History in provider requests. Maintain account/provider namespace isolation and no extra OAuth scopes/permission prompts. Preserve Cloudflare TRUE REMOTE and other providers' existing transfer behavior.

## 4. Theme-specific SUCCESS! celebration, verified completions ONLY

Applies to the destination card for the provider that *actually committed* the file. The word is invisible at rest and vanishes completely after its short celebration. Every subsequent **independently verified successful save** plays it again, including when the last run has ended. A failed/pending/uncertain save, reconnect, login, menu click, impact pulse, archived History replay, or count hydration **never** plays SUCCESS!. These are transient presentation effects and do not mutate the lifetime number.

### 4.1 Neon ONLY: nostalgic SNES-style flash

- The **entire word SUCCESS! appears together**; no letter-by-letter entrance.
- Flash brightly and crisply in the style of a nostalgic SNES game, alternating vivid **money/neon green** against its **established normal Neon-theme SUCCESS! colors**. Respect the theme's existing appropriate offset/shadow/double-impression accents where already designed; this request does *not* demand changing the entire card's palette.
- After the brief sequence, the word **disappears automatically**. It is never a persistent badge and requires no click to dismiss.
- On the next verified save, restart the temporary flash. Keep the Neon counter arcade-like and correctly cumulative; it must not reset to zero, duplicate +1, or shrink except as needed for digit fitting.

### 4.2 ALL non-Neon themes: Times New Roman italic, typed letter by letter, then 3 appearances

- Use the elegant, professional, Roman/classical feel of **italic Times New Roman** (CSS/system Times New Roman, Times, serif with italic styling and legal built-in fallbacks). Do not substitute Neon's arcade lettering. Respect each theme's own colors and contrast.
- The word **builds slowly, character by character** on the correct card: S → SU → SUC → SUCC → SUCCE → SUCCES → SUCCESS → SUCCESS!.
- Once fully formed, perform **two short flashes** (on/off, on/off), followed by a **third appearance that remains visible noticeably longer**. Then fade/vanish automatically, returning to a completely hidden state.
- No card click to dismiss, no persistent reserved label or permanent layout shift. Protect existing GO TO, FREE GB, connection status, logo, and cumulative counts.

### 4.3 Shared animation integrity

- Bind animation start to a deduplicated **terminal verified-success event**, not an optimistic step, and direct it to the matching provider/account destination card.
- Rapid successive confirmed saves must be handled gracefully (reset/retrigger or queue visual celebrations predictably); each verified job increments only once.
- Theme switching, Shelf close/reopen, browser zoom, screen reader announcements, responsive widths, and prefers-reduced-motion must not leave stuck SUCCESS! text or lose the underlying completion record. Use a reduced/instant non-flashing announcement for reduced motion.
- Keep **save-impact pulse** and **working falling ball** separate: dispatch impact may happen on an attempted save, but it must **never** be treated as verified completion. Do not rewrite the working falling ball.

## 5. Acceptance tests and proof matrix

Add deterministic automated regression tests and run relevant existing checks, plus installed Chrome/live Dropbox acceptance only where actually authorized and available. Cover:

1. Logged-out Dropbox card with still-visible native menu entry; validate login vs save action truth and no false-success side effects.
2. Expired, revoked, mismatched-account, root/namespace rejection (including root/home variance), unavailable destination and reconnect flow.
3. Source fetch succeeds but Dropbox upload fails; response is denied/timeout; upload session starts/appends but never finishes; uncertain final commit with readback/no readback.
4. A real positive completed Dropbox response + supported exact metadata verification; correct account, filename/extension, root, remote ID/path and only one +1.
5. Duplicate event, retries, quick consecutive saves, service worker suspension/restart, history hydration, Shelf reopening and cross-provider isolation.
6. History accurately displays each operation state; no successful GO TO for blocked/failed/uncertain jobs; previous records remain intact.
7. Neon idle hidden → whole-word alternating money-green/SNES flash → automatic hide → fresh successful replay; no replay on failed save.
8. Non-Neon (Porcelain, Midnight, other enabled themes) idle hidden → italic Times New Roman-style letter-by-letter build → two brief flashes → longer third hold → disappearance → replay.
9. Responsive Shelf widths, theme changes, reduced motion, card controls not obstructed, exact cumulative count persistence, no increment on merely opening a menu or reconnecting.
10. Cloudflare, Google Drive, OneDrive and V3 native menu behavior remain working; original source-page falling ball and distinct Shelf save-impact pulse are not regressed.

**Evidence required:** baseline SHA/branch, actual root cause with source paths/line landmarks, narrow diffs, PASS/FAIL/NOT_TESTED matrix (no fake green full suite), mock vs local installed Chrome vs authenticated remote Dropbox clearly distinguished, account/root/receipt proof redacted, previous false-count assessment, and concrete remaining limitations. A mocked API response is NOT proof that a real Dropbox file exists. Do not upload/delete customer files for investigation.

## 6. Delivery

1. Implement smallest safe changes on codex/v3-parity-first-reconstruction; do not fork V3/native menu writers or alter protected checkpoints.
2. Add tests and a focused report explaining the exact receipt, History, counter and animation contracts.
3. Update existing relevant bugs and NEED_TO_DO records without erasing prior evidence. Cross-reference the older Dropbox namespace incident and save-impact request.
4. Record test commands/results, changed files, evidence and any live acceptance blocker; commit and push to the working branch, NOT main.
5. End with a concise operator retest procedure: disconnected Dropbox right-click, successful upload verification in Dropbox, failed save's honest History/counter, and each theme's timed SUCCESS! appearance.

**Hard acceptance:** If Dropbox has not verifiably committed the file, REDOWN cannot report success, increase a successful-save counter or play SUCCESS!. Neon alone flashes the whole word in money-green SNES colors; every other theme uses italic Times New Roman letter-by-letter entrance, two short flashes, longer third appearance, then hides.


## Implementation follow-up — 2 November 2026

Source/mock implementation delivered on the requested branch; [actual results, limitations and operator retest](../../docs/DROPBOX_VERIFIED_SAVE_REPORT_2026-11-02.md). The owner incident is still OPEN pending installed Chrome and authenticated original-account/root proof. No historical total correction, live file upload/deletion or main merge was performed. Original request and acceptance requirements above remain intact.
