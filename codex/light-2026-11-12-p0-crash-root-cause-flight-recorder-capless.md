# LIGHT Codex starter — REDOWN P0 crash/root-cause + opt-in CAPLESS LOGGING

**Archived:** 2026-11-12 (America/Chicago)  
**Authoritative brief:** [`codex/2026-11-12-p0-crash-root-cause-flight-recorder-capless.md`](2026-11-12-p0-crash-root-cause-flight-recorder-capless.md)  
**Target repo:** `thanks-cohn/REDOWN`  
**Branch rule:** ALWAYS fetch and base implementation off the **latest `origin/main`**, because the crash diagnostics repair is already on main. You may create a new focused Codex branch from main; target a reviewed merge back into main. Do not use the old crash-fix branch or historical tag as the implementation base.

## Starter prompt to paste into Codex

Read and execute **`codex/2026-11-12-p0-crash-root-cause-flight-recorder-capless.md`** in full. This is an urgent P0 REDOWN reliability/root-cause mission, **not just logging polish**. Base your new working branch on the latest `origin/main`. Investigate why Chrome made REDOWN unavailable until Reload and why YouTube failed at the same time, using the redacted incident evidence and existing storage timeout/worker-epoch data. Find and repair any supported root cause, or explicitly report uncertainty; do not invent crash diagnoses.

Implement a low-overhead, persistent pre-crash flight recorder, a reviewable recovery/incident timeline with honest gaps, and **CAPLESS LOGGING**: **OFF by default**, ON only after a deliberate user click AND confirmation, locally append-only with no automatic age/count/size pruning or overwrites while enabled. Use small bounded RAM and honest disk/quota warnings. Preserve the original RAW/SECURE exports, original seven-file bundle, user data, provider auth, Shelf, cloud saves, Chrome CSP and diagnostics. Never claim every hard Chrome crash can run a final callback. Test startup, timeout/late responses, interrupted persistence, 100k events, Chrome reload/recovery and privacy; commit focused code and evidence on your main-based branch, prepare a reviewable integration into **main**, report tests, remaining risks and limitations, then STOP.

## Permanent warning

The tag `95-percent-plus-success` is a **historical checkpoint**, not proof of a 95% lifetime success rate or crash immunity. The prior crash's root cause remains unknown. Logging itself (storage contention, backlog, lock waits, resource exhaustion, listener timing) **might worsen or expose the same failure**, but none of those potential causes is confirmed. Do not merge solely because diagnostics appear busy or a Node unit test passes. A new extension-unavailable incident is release-blocking until investigated.

This document is only the archived starter. The detailed brief controls scope and acceptance.
