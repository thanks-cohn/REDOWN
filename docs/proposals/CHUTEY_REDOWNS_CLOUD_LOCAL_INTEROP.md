# REDOWN ↔ Chutey: cloud/local drag-and-drop interoperability

**Status:** proposed implementation contract, not shipped code.
**Owner goal:** Drag actual files from REDOWN's connected cloud folders into an explicitly chosen Chutey local folder, and drag actual local files from Chutey into an explicitly chosen REDOWN cloud folder. A single intuitive workspace; preserve two distinct engines.
**Chutey master requirement:** https://github.com/thanks-cohn/chute/blob/main/In_Progress/REDOWN_CHUTEY_BIDIRECTIONAL_INTEROP.md

## User journeys

**REDOWN → Chutey:** User selects one or more cloud files in REDOWN Universal File Explorer and drops them onto a Chutey local directory. REDOWN's authorized adapter reads the selected provider objects; Chutey's approved Python local worker writes the real bytes to exactly the chosen folder, applying KEEP BOTH unless the user chooses another safe conflict policy. Confirm the final file exists, bytes/hash match, and source cloud object remains untouched by a copy.

**Chutey → REDOWN:** User drags local file(s) from Chutey File Explorer onto the desired REDOWN provider/bucket/folder. Chutey exposes a short-lived, explicitly authorized stream of the real file bytes; REDOWN's *existing cloud provider upload APIs* own the write, destination verification and credential handling. Chutey does not receive provider tokens. REDOWN providers receive only needed bytes, filename and minimal metadata—not the user's local absolute path or browser provenance.

**Move:** Explicitly selected and only after independently confirmed destination, with separately authorized source deletion. Neither a drag gesture nor a "started" receipt authorizes destructive cleanup.

## Two source-of-truth adapters, no duplicate workers

- REDOWN: extend Universal File Explorer's UI, drag target/source adapters and existing provider file API. Reference extension/beta/explorer.mjs, extension/beta/file-api.mjs, existing R2/Google Drive/Dropbox/OneDrive provider code, docs/beta/EXPLORER.md and docs/EXPLORER_CONTEXT_MENU_REPORT.md. Do not duplicate Cloudflare Worker or migrate REDOWN's auth into Chutey.
- Chutey: extension File Explorer tab plus current local Python companion. Reference src/chute/server.py, extension/content.js and extension/drag-relay.js in thanks-cohn/chute. This companion alone owns local filesystem grants and writes, with headless Python test API.
- Introduce a small versioned transfer-intent and receipt contract: request/correlation ID, source identity, chosen destination capability, operation (copy by default), filename/type, expected size, streaming bytes, cancellation/progress, integrity and completed/partial/failed/uncertain outcome. Keep auth tokens and local absolute paths private within their respective apps.
- A Chrome private drag token in one extension does NOT imply a second extension can read it. REDOWN's existing internal cloud-folder drag token and Chutey's internal file token are currently different. Cross-extension origins, trusted user gestures, content-script restrictions and site upload constraints require a tested, permissioned, user-initiated handoff rather than naïvely synthesizing a DragEvent. Where native drag fails, offer explicit Save to Chutey… / Send to REDOWN… with real target selection. Do not fake success.
- Preserve REDOWN TRUE REMOTE URL right-click flows. Cloud-to-local intentionally creates a local file; local-to-cloud intentionally transfers local bytes, so neither flow should be misleadingly described as TRUE REMOTE.
- Restrict destinations to user-authorized exact provider/folder or Chutey root-scoped directory; protect both sides against unauthenticated loopback writes, arbitrary page drag payloads, origin confusion, short-lived grant replay, symlink escapes, overbroad privileges, leaks and unexpected overwrites.
- Support incremental/streaming data, backpressure and actual provider limits, not base64 whole-file buffering for large transfers. Journal incomplete operations for safe reconciliation; never blindly retry an uncertain write.

## Contract-first test and acceptance plan

1. REDOWN R2 object → exact approved Chutey directory; independently verify bytes, expected basename, final path and preserved source.
2. Chutey local PNG/PDF/video → exact REDOWN R2 nested destination; independently read back and verify. For Google Drive, Dropbox and OneDrive, test each separately when credentials/scopes exist; mark unavailable live tests BLOCKED.
3. Multi-select, folder targets, duplicate and Unicode names, keep-both conflicts, large streams within true limits, zero-byte files, cancellation, network drops, provider token expiry, disk-full, browser/native companion restart, duplicate delivery and partial completion.
4. Negative security tests: unauthorized provider/account, unauthenticated origin, malicious filename/absolute path, junction/symlink escape, stale token, forged drag receipt and unexpected file deletion.
5. Deterministic test fixtures using Chutey's headless Python scenario runner and REDOWN's Universal File API lab patterns. Run the actual production adapters behind controlled fixtures and compare independent SHA-256 snapshots rather than treating operation receipts as proof.
6. Installed Chrome drag/drop interaction tests must be reported separately from mocks; say clearly whether direct cross-extension drag works or the explicit user-initiated fallback was required. Don't claim arbitrary provider/live connection validation without access.

## Implementation coordination

REDOWN Codex agent builds provider-facing interoperability adapter and cloud explorer drag source/target; Chutey Codex agent builds authenticated local receiving/producing adapter and local explorer drop targets. Define the shared protocol together before independent implementation; version it and test compatibility from both ends. A Chutey-only feature cannot automatically cause an old REDOWN extension to accept foreign drops.

Do not merge or replace a working release until a compatible Chutey companion EXE, Chutey Chrome extension and REDOWN Chrome extension have passed joint acceptance. This is an addition to the REDOWN Universal File API architecture, not a requirement to rewrite V3 right-click, BOOT or cloud provider engines.
