# REDOWN — Codex Implementation Assignment: One-Click Multi-Bucket Architecture Laboratory

**Status:** Implementation assignment, not a proposal-only exercise.
**Repository:** `thanks-cohn/REDOWN`; start from latest `main`.
**Priority:** Reliable, independently verifiable real filesystem operations; no simulated success.
**Fixture directory:** `test-fixtures/architecture-samples/` (60 tracked files, flat, 32 extensions as initially selected).

## 0. Read this first: existing architecture and limits

Inspect current source before changing it, especially:
- `docs/phase27/README.md`, `docs/phase27/IMPLEMENTATION.md`, `FOREVER_WORKS/PHASE27.md`
- `clients/python/redown/lab.py`, `extension.py`, `native_host.py`, `cli.py`, tests
- `extension/laboratory.mjs`, `extension/lab-session.mjs`, `extension/file-engine/`, `extension/cloudflare-api.js`
- canonical Universal API and adapters, journal/Resource Atlas, relevant existing verification and Forever Works intent.

**Important current boundary:** Phase 2.7 extension-authenticated native bridge is read-only, has a 64 KiB bounded read, and doesn't advertise upload/copy/move/rename/delete or durable reconnect recovery. Do not present it as writable. Implement safely where feasible; mark unsupported or blocked operations accurately instead of routing around it or inventing receipts. Python must never receive the extension's OAuth tokens, Cloudflare account secrets or arbitrary shell powers. Retain versioned universal API and provider adapter architecture.

## 1. Desired product behavior

An ordinary Windows user should be able to:
1. Open the existing Tkinter REDOWN Python Laboratory.
2. Start/refresh an explicitly approved, authenticated REDOWN extension connection as they can today; see actual connection/pairing/expiry status.
3. Choose **any local directory** (including the checked-in 60-file pack). The directory selector is a normal GUI picker, not an advanced JSON form.
4. See an automatic fixture selection preview, count by extension, counts skipped and total bytes.
5. Select one or many authorized R2 test buckets (four recommended for coverage, *not* a hardcoded requirement); show discovered capabilities. Mixed public/private URL policies are not grounds for changing bucket policies.
6. Click a prominently labeled **RUN ARCHITECTURE TESTS** button.
7. Inspect progress per operation, bucket, selected file and verification outcome. Save detailed JSON and Markdown reports, and click **COPY JSON REPORT** to copy exact report text to clipboard. No manual JSON or file-by-file input necessary.

Keep the existing advanced request runner and read-only conformance functionality; no regressions.

## 2. Deterministic automatic selection from *any* directory

- Recursively inventory the selected local directory, preserving each file's relative path in the report, without modifying source files.
- Group by lowercase extension; treat `.jpg` and `.jpeg` as distinct extension labels and record case normalization.
- Choose **up to five distinct real files per existing extension**; if at least one eligible file exists for an extension, choose at least one. For only three PDFs choose three; for 423 PNGs choose five. No arbitrary overall 60-file cap when a user chooses a larger directory.
- Be deterministic across runs. Favor useful size diversity, directory depth, and distinct content rather than always choosing the five smallest. Avoid SHA-256 duplicate contents within an extension; report all exclusions and reasons.
- Do not follow directory junctions/symlinks outside root, recurse infinitely, process inaccessible/unreadable files as successes, or read file contents into memory unnecessarily. Handle empty directories, extensions absent, dotfiles, case collisions, Unicode/long paths, zero-byte files and sparse files with documented policies.
- Make reasonable local scan/file/total safety limits visible and configurable where appropriate. Do not silently omit larger files. If the connected transport cannot upload/read a given sample, report it as unsupported with size/capability reason; don't silently shrink the corpus.
- Calculate independent local SHA-256 and byte counts; preserve provenance to original relative path. The existing pack includes deliberately tiny or possibly malformed file-format examples. **Never infer valid media decode merely from extension or successful hash transfer.** Include separate diagnostics for probable incomplete/invalid media when actually validated; raw byte integrity remains legitimate coverage.
- Run on the 60-file checked-in pack and on synthetic temporary nested directories in automated tests. Do not alter the corpus unless necessary and authorized.

## 3. Universal API scenario matrix

Use REDOWN's **real canonical Universal API** and provider adapters for every operation—never bolt a separate boto3/S3 uploader to Python just to pass tests. No hardcoded R2-only assumptions in shared coordination/case logic; provider capabilities negotiate operations.

For each selected authorized bucket, exercise *supported* read-only flows and provider-evidenced results:
- Discovery, capability negotiation, list, pagination, metadata, existent/missing objects, filtering/prefixes where supported, authorized read/download, bounded partial reads if supported.
- Independent SHA-256 of source and reconstructed local download, byte counts, exact object identity and evidence correlation.
- Meaningful negative tests: unauthorized bucket, stale/revoked grant, invalid key/input, missing object, unavailable capability, interrupted connection, rate limit/timeout with truthful unknown states.

For **mutating tests** (upload, create, mkdir/prefix semantics, copy, move, rename, inter-bucket transfer, duplicate identity, versioning, idempotency, overwrite preconditions, recovery and delete), first implement a narrowly scoped, explicitly approved write-capable path *only if safely possible through the existing REDOWN architecture*. Requirements:
- Write permissions must be distinct from read-only and explicitly user-approved per test session; dedicated test buckets and unique run-specific prefixes only. Preview exact scope and consequences.
- Prove conditional/non-overwriting writes, path traversal protections, bounded chunk/stream support, safe request correlation, crash/retry uncertainty handling, and durable idempotency prior to considering write operations verified.
- No touching arbitrary existing objects, production prefixes or bucket settings; **no bucket creation, policy changes, global listing outside scope, or automatic deletion**. Cleanup must be separately selected/approved, restricted to this run's proven objects and with a recovery-safe audit trail. Default retains test objects unless user opts in.
- If the current OAuth adapter or bridge cannot meet these conditions, implement what can be validated without bypassing security and emit **UNSUPPORTED/BLOCKED** for the remainder. A run that only performs read-only checks is not full end-to-end architecture acceptance.
- Use multiple buckets for cross-bucket cases where the grants/capabilities permit; distinguish lack of a fourth bucket from a failed transfer, and show coverage by provider/account/bucket/policy/capability.
- Same bytes under different names, different bytes with same name in distinct prefixes, unusual UTF-8 keys, long names, zero bytes, large streaming files, duplicate content and interrupted operations should be explicit fixtures/scenarios with independent expected results.

## 4. Reports must be auditable, not optimistic

One consistent structured report schema, with stable version, run ID, timestamp, source inventory summary, selected file details (relpath, extension, byte count, local sha256), anonymized/scoped bucket identities, discovered capabilities, operations/cases, redacted request IDs, status, errors, retries, timing, evidence IDs/provider receipts, hashes/readback proof, and non-destructive cleanup state.

Statuses must separately and consistently express PASS, FAIL, BLOCKED, UNSUPPORTED, NOT_TESTED and INDETERMINATE/UNCERTAIN, including incomplete interrupted runs. Avoid inventing cloud ETags as SHA-256. A successful HTTP response or local file copy alone is not proof of provider-verified transfer. Explicitly distinguish synthetic, mocked, source-verified, and live R2 evidence tiers. Include coverage counts and an overall **INCOMPLETE** unless acceptance criteria actually satisfied. No credentials in report; user is warned that metadata may be sensitive.

GUI: **COPY JSON REPORT** copies the exact formatted JSON for a completed or partially completed run; **SAVE JSON** and **SAVE MARKDOWN** controls write correct files. Provide equivalent noninteractive CLI for agents and CI; no browser interaction required for offline/mock execution. Support structured nonzero exit codes for failed, blocked, and invalid runs.

## 5. Quality bar and tests

- Implement incrementally, favor small auditable changes and tests over a grand rewrite. Test inventory/selection behavior, number targets, unique hashes, exact file identities, 60 tracked fixture pack, pairing/scopes, receipt/evidence correlation, progress, cancellation, resumption/unknown states, negative tests, report serialization, clipboard/UI callbacks where practical, and CLI parity.
- Probe the **actual 60 tracked files** in `test-fixtures/architecture-samples` and record their true characteristics. Some are 15–300 bytes and may be valid minimum files or deliberately malformed; don't assert full decoding.
- Keep deterministic offline/CI tests separate from **real Chrome + native host + Cloudflare R2** acceptance. Running CI and mocking R2 cannot certify the latter.
- Run existing JS, Python, conformance and API regression tests; fix regressions in REDOWN itself, including beta Explorer, session, adapter, journal/Atlas where appropriate and verified—not by papering over flaws in the laboratory.
- Preserve provider-independent contracts, extensible capability registry, Forever Works purpose/obligation links. Record deferred obligations and failed evidence.
- Test Windows UX when an interactive Windows environment is accessible; otherwise call it untested explicitly. No fabricated screenshots or provider receipts.
- Don't spend hours on decorative/UI polishing before a working scan, evidence schema and tests exist.

## 6. Deliverables and finish conditions

1. Working GUI directory picker, selection preview, automated run button, progress and report copy/save.
2. Reusable inventory/selection/runner/report modules, independently callable from Python/agent CLI.
3. Safe scoped integration to REDOWN canonical engine for supported real operations; any safe, separately authorized write expansion only when its necessary security and reliability requirements are met.
4. Automated tests proving deterministic selection, fixture pack coverage, no unintended mutations, honest statuses, exact report correctness; existing regression tests green.
5. A straightforward Windows PowerShell runbook in `docs/phase27/` with installation/update, extension reconnect, test-run instructions, how to provide bucket approvals, and how to copy reports.
6. `verification/` evidence with explicit test commands/outcomes, blockers, unresolved live acceptance and remaining work, and updated Forever Works obligations.
7. Commit implementation to `main` when checks pass and report commit SHA and changed paths. If blocked by permissions or conflicts, never force-push; report precisely what changed and what remains uncommitted.

**Key acceptance:** User can point REDOWN at a folder with 423 PNG, 3 PDF and 1 HEIC, and it deterministically selects 5/3/1 respectively, automatically plans/executes all *permitted* verification against selected scoped buckets, and produces independently reviewable JSON via one button. Every unsupported capability or unavailable live connection is labeled plainly. No data loss, secret leakage, false proofs, or adapter-specific shortcuts.
