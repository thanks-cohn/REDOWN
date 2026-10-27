# REDOWN: BETA EXPLORER PARITY, CONFIGURABLE UNIVERSAL API, AND VISUAL REDESIGN

**Repository:** `thanks-cohn/REDOWN`
**Working branch:** `beta-explorer`
**Known checkpoint:** `8545895aff026e2438239fd72d9e01d692c7cee0` (start from the latest branch head)
**Priority:** CRITICAL
**Execution limit:** **30 minutes maximum, wall-clock**
**Handoff deadline:** **At minute 25, stop adding features and START writing a durable handoff.** Reserve minutes 25–30 for testing, committing, pushing, and completing the handoff. At minute 30 STOP implementation regardless of remaining work. Never claim unfinished work is complete.

## 1. Primary directive

**Build the working product. Achieve feature parity. Keep one genuinely configurable universal file API.**

The Beta Explorer must be able to do everything the original production Explorer can do, with no loss of supported file sizes, features, transfer behavior, or reliability. The architectural difference is **Beta GUI → Universal File API → Provider Adapter → Cloudflare R2 / established production services**. Every Beta file operation must travel through that API. The original Explorer is the functional reference, not discarded code.

**Do not rewrite working TRUE REMOTE or other proven production capabilities. Do not import the abandoned experimental file engine. Do not build another laboratory or spend the session writing architecture proposals.**

## 2. Repository discipline and sources

Work on `beta-explorer` ONLY, without modifying `main`. Preserve the original Explorer and its right-click TRUE REMOTE. Make incremental working commits and push to `beta-explorer`.

Inspect `extension/beta/explorer.html`, `explorer.css`, `explorer.mjs`, `file-api.mjs`, `r2-adapter.mjs`, and the original Explorer, background/Worker, Cloudflare auth and provider operations. Read `DO_NOT_REPEAT_MISTAKES/BASIC_requirements.md` from `archive/pre-clean-slate-2026-10-27` as the GUI-to-API requirements reference, not as architecture to import. This request takes precedence over conflicting historical instructions.

## 3. Full original-Explorer functional parity

Inspect the original implementation and create a *brief actionable* parity checklist, then immediately implement the highest-value gaps. Cover existing account and bucket management; destination profiles; navigation, breadcrumbs, back/forward/parent, refresh, search, filter, sort, metadata and previews; uploads, downloads, multiple files, folders, copy/paste, cut/move, rename, delete, duplicate, overwrite, conflict handling, nested directories, bulk actions, selection, drag/drop, keyboard shortcuts, context menus; notification and transfer status; TRUE REMOTE and advanced original features.

Never claim the Beta has full parity from its current unit tests alone. Distinguish features the original actually supports from new feature requests, and record uncompleted parity gaps.

## 4. Mandatory rule: defaults are not artificial ceilings (PAGINATION EXCLUDED)

Replace arbitrary hardcoded *operational* values with reasonable, effective defaults that can be overridden through the universal API at runtime, **excluding all pagination-related values and behavior**.

Applies, where adjustable and relevant, to transfer thresholds, chunk/part sizes, concurrency, retry counts/backoff, timeouts, batch sizes, memory budgets/buffers, progress frequency, file-selection processing, directory traversal outside pagination, and search behavior unrelated to pagination. Do not convert genuine security, correctness, resource-safety, browser/runtime, or provider protocol restrictions into bypassable options. Do not make a performance default a universal file-size ceiling.

Configuration precedence: **per-operation override > user/session preference > provider default**. Keep it lightweight. Validate overrides, reject unsupported values clearly, and **prove an exposed override changes real operation behavior**; do not silently accept inert options. Example conceptual call:

```javascript
await fileApi.run("upload", {source, file, key:file.name}, {
  transfer: {multipartThresholdMiB:50, partSizeMiB:16, concurrency:3, strategy:"auto"}
});
```

The settings in that example are illustrative. Only expose strategies/options that genuinely work.

### File sizes and methods

**50 MiB is a test/default threshold, NOT an upload ceiling.** The current Beta adapter's **300,000,000-byte** direct-upload rejection may remain *temporarily* because the selected Cloudflare REST endpoint has a genuine request limit. That restriction is specific to that upload method, **not the universal API** and not TRUE REMOTE, download, copy, move, or other paths. Never just delete the check and send invalid oversize requests to the same endpoint. Reuse existing larger-transfer routes that are genuinely supported; add real multipart where practical and tested. Otherwise be explicit that larger local uploads are pending support, without redesigning the API. Preserve source byte integrity and bounded-memory transfer semantics.

### Timeouts

Investigate existing 120-second background and 300-second upload/verification deadlines, including inherited transport restrictions. Convert arbitrary adjustable deadlines to real defaults/overrides while maintaining inactivity detection, progress, cancellation, and correct uncertain-outcome handling. **Never blindly retry an ambiguous write**.

### Pagination: explicitly out of scope

**Do not change pagination page sizes, cursor rules, page guards, limits, or configuration.** Preserve the current behavior. No pagination refactor, tests for removing pagination limits, or pagination-related override work unless absolutely required to fix a regression directly introduced by this session.

## 5. Universal API is the only Beta operation path

Maintain one operation contract: `connect`, `disconnect`, `accounts`, `buckets`, `list`, `stat`, `upload`, `download`, `mkdir`, `copy`, `move`, `rename`, `delete`, and `remoteIngest`. Extend only for real missing functionality. GUI owns local presentation/selection/clipboard/history state; actual file operations use the API. Existing production operations can be reused **behind the provider adapter**, not bypassing the API. Keep interfaces viable for eventual S3-compatible, Google Drive, OneDrive, and MEGA adapters, but do not implement other providers now.

## 6. Preserve working TRUE REMOTE

Reuse the original context-menu → URL capture → destination profile → auth/background → Cloudflare Worker remote fetch → R2 write → notification/status pipeline. Do not rewrite it. The user's computer must not relay remote-source bytes. Expose the same proven pipeline in Beta through `remoteIngest`; do not impose the local REST upload ceiling on an unrelated TRUE REMOTE method. Fix only demonstrated issues narrowly. Original right-click behavior must remain functional.

## 7. Red-and-white aesthetic redesign

Make Beta visually DISTINCT from the original, polished and more spacious, with warm white/off-white surfaces, deep red/crimson accents, charcoal typography, soft neutral grays, restrained shadows/borders, and readable status indicators. Improve sidebar organization, grouped toolbar, breadcrumbs, file-row spacing, list/grid layouts, selectors, selection states, dialogs, context menus, transfer progress, empty states, and responsiveness. Keep navigation and large-folder workflows efficient and accessible. Use lightweight CSS variables/tokens so alternate templates and color pairings can be added later. **Do not build a heavy theme editor.** Beauty must not displace working operations.

## 8. Reliability and scope

Preserve accurate file bytes, explicit source/destination, conflicts, partial/uncertain outcomes, cancellation, and responsive bounded-memory transfers. No unnecessary atomicity requirements, competing engines, massive diagnostics infrastructure, simulated success, unauthorized cloud mutations, or claims of verification where no live Chrome/R2 test was performed. Protect original production behavior. Focus implementation time on proven parity and visible GUI improvement.

## 9. Execute in this order, with a strict timebox

- **Minutes 0–5:** Inspect original/Beta, identify highest-risk parity gaps, configuration blocks, and working production integrations. Make a short checklist; no lengthy planning.
- **Minutes 5–18:** Implement highest-impact parity and real configuration defaults/overrides through the universal API, preserving provider limits and existing TRUE REMOTE.
- **Minutes 18–25:** Implement the spacious red-and-white GUI improvements, connect and test working interactions, and fix obvious regressions. Commit incrementally.
- **MINUTE 25 HARD HANDOFF TRIGGER:** **STOP STARTING NEW FEATURES. START PRODUCING A HANDOFF immediately**, including actual changed files, verified working actions, configuration overrides that genuinely work, parity gaps, provider-method constraints, tests and blockers. Use remaining time to finalize focused checks, commit and push.
- **MINUTE 30 HARD STOP:** End the task, deliver the handoff and commit/branch links. Do not continue developing after 30 minutes or pretend time is available to complete unresolved work.

If implementation is unusually difficult, still deliver the best verified partial result **inside** the time limit. Do not sacrifice handoff, commit, and push for a last-minute feature.

## 10. Focused verification and completion report

Test default vs session vs per-operation override precedence; effects of supported overrides; unsupported option rejection; 50 MiB not being a universal cap; method-specific 300 MB limit; no new original parity regressions; preserved TRUE REMOTE; copy/move/rename/delete content semantics; timeouts; Beta GUI-to-API routing; visual responsiveness. **Confirm pagination unchanged**, not redesigned. Differentiate fixture tests from installed-Chrome/live-R2 acceptance. Only perform live mutation in an owner-authorized disposable namespace.

At minute 25 begin a concise, durable handoff (e.g., `docs/beta/HANDOFF.md`) and finish it by the minute-30 stop. Report: implemented features and remaining gaps; API and adapter changes; configurable defaults and proven overrides (excluding pagination); real provider restrictions; original TRUE REMOTE status; GUI changes; test commands/results and live-verification status; files changed; commit SHA; next single highest-value task. Push `beta-explorer`; leave `main` untouched.

## FINAL DIRECTIVE

**FULL ORIGINAL EXPLORER FUNCTIONAL PARITY. ONE UNIVERSAL FILE API. WORKING CONFIGURABLE DEFAULTS WITHOUT ARTIFICIAL CEILINGS. PAGINATION UNCHANGED. PRESERVED TRUE REMOTE. SPACIOUS RED-AND-WHITE GUI. WORKING, VERIFIED COMMITS.**

**30 MINUTES MAXIMUM. START THE HANDOFF AT MINUTE 25. STOP AT MINUTE 30.**
