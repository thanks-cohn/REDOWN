# Codex request — Automatic forensic diagnostics + two NEW export buttons only

**Date:** 2026-11-12  
**Repository:** thanks-cohn/REDOWN  
**Status:** Implementation request, NOT an implemented feature  
**Scope:** ONE targeted change: automatically record full REDOWN save-attempt diagnostics locally, and add two export buttons. Nothing else.

## Owner's non-negotiable requirements

1. **Capture full diagnostic evidence automatically by default** for REDOWN save attempts and their subsequent transfer outcomes, even when Debug Mode/Options is closed. Do not require clicking Inspect, toggling enhanced capture, or selecting an export mode before the failure.
2. **One canonical local forensic record**, containing raw, as-observed data. It is not necessary to build two independent logging streams. On export, produce **two different views of the same stored evidence**:
   - **Export All Diagnostic Data (RAW)**: full recorded source URL, webpage URL, original errors, timestamps, stage timeline, provider, destination, and observed redirect/HTTP data, **without silent URL or error redaction**.
   - **Export Secure Diagnostic Data**: redact sensitive URL/query/path, account/destination and error details as appropriate, but retain useful matching/correlation IDs, event order, provider/status classes, timings and failure categories. The secure export must not mutate or overwrite the raw local evidence.
3. **ADD exactly these two buttons** to the existing Developer/diagnostics controls in Options. **Preserve every existing button** — including Inspect save attempts, Inspect runtime, Export Diagnostic Bundle, Clear traces, Inspect startup, Repair entrypoints, Export startup receipts, and Explorer diagnostics — with their current labels, IDs, workflows and effects. In particular, do NOT replace or rename the existing Export Diagnostic Bundle or change its established output format. Do not change Clear traces to delete the new forensic ledger.
4. This task is **diagnostics-only**. Do not change the cloud upload/download pipeline, right-click routing, authentication, History, counters, providers, UI themes, bucket activation, or unrelated code. Do not perform repair operations, additional cloud requests, or data migrations that overwrite existing records.

## Minimal required data per observed save attempt

Use a stable attempt ID to correlate each stage and its provider result:

- **What:** selected candidate asset URL (**complete literal `sourceUrl`**); original `srcUrl` and `linkUrl` if available; source-kind/context, filename, type, size and source HTTP response metadata where observed.
- **Where:** original hosting webpage's **complete literal `pageUrl`**, distinguishing it from the asset URL; actual selected provider/account/bucket/folder/prefix/destination as observed, plus final remote object identity if verified. Hosts/domains can be derived for grouping but **are not substitutes for the full URLs**.
- **When/how:** click time, per-stage timestamps/durations, runtime/worker epoch, route choice, source acquisition, queue/admission, cloud write, verification, History and counter bookkeeping, terminal outcome.
- **Why:** original observed exception/error code/message (and stack if already available), source/provider HTTP failure details, redirect/final URL **when actually observed**, retry/restart/interruption, verification evidence or missing evidence.
- **Which component:** differentiate source website/CDN, Chrome/permissions, REDOWN runtime/queue/History, and cloud provider when the evidence supports the attribution; otherwise mark as **unattributed** rather than guessing.

Only record events associated with REDOWN save operations, not unrelated browsing history. Do not invent inaccessible URLs, skipped stages, response bodies or remote confirmation. Do **not** deliberately collect passwords, OAuth tokens, cookies, authorization headers, or arbitrary response bodies solely for diagnostics. Exact URLs in RAW may themselves include signed secrets; **keep them exact** if legitimately captured, and show a prominent warning before the user exports/shares RAW.

## Targeted implementation

Start by inspecting only the relevant code, probably:
- `extension/options.html` and the narrow event-handler portion of `extension/options.js`;
- `extension/runtime-diagnostics.js`, `extension/diagnostic-download.js`, `extension/diagnostic-bundle.js`, `extension/save-evidence.js`;
- only the specific save-attempt creation/terminal-recording call sites in `extension/background.js` and provider paths **if absolutely necessary**.

Use a separate, versioned, **bounded, restart-tolerant local forensic store** so existing storage keys and evidence are never overwritten. Automatic recording must be best-effort and never block actual saves; retain a truthful dropped/expired-record count and storage-failure indicator instead of pretending completeness. The same stored raw snapshot must drive both new ZIP exports. Include schema/version, collection scope, completeness, record counts and timestamp. Keep exports local-only, explicitly user-triggered, with distinct filenames and a clear RAW privacy warning. Do not add network permissions, telemetry, backend uploads, or new browser-wide listeners.

For existing stored events that predate this change, preserve them and mark any missing raw details `not_recorded`; do not pretend raw URLs can be reconstructed from source fingerprints.

## Strict scope/time-efficiency rules for Codex

- **No repository-wide audit or modernization**, no architecture inventory, no unrelated search, no provider bug hunts, no blanket AGENTS/documentation survey. Observe any mandatory repository instructions, but do not turn this into an AGENTS-driven broad review.
- **Do not run the entire test suite** for a small diagnostic change; run syntax checks and only **focused diagnostic/UI tests** covering automatic capture, independent raw/secure exports, privacy-redaction boundaries, old button preservation, and no transfer side effects. Report any unrun tests as unrun.
- **Do not modify unrelated files**, replace diagnostic outputs, clean/reset the working tree, delete historical diagnostics, or make cloud writes.
- If implementation would require a major transfer/architecture rewrite, **stop at the narrow blocker** and explain it instead of expanding the task.
- No requirement for a huge evidence corpus, extensive unrelated documentation, or live provider testing.

## Definition of done

New diagnostic capture is automatic on REDOWN saves; RAW faithfully exports recorded evidence; SECURE independently redacts a copy of that evidence; **all old diagnostic buttons remain unchanged**; no cloud save/auth/History/counter regression; focused tests and a concise changed-file/verification report supplied. **This document alone does not implement the feature.**

**Owner summary:** Keep everything automatically, then let me click either **Export All Diagnostic Data (RAW)** or **Export Secure Diagnostic Data**. Add these buttons; don't touch the ones I already have.
