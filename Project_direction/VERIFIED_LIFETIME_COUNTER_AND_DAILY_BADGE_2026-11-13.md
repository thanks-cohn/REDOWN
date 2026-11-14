# ReDown project direction — timeless lifetime counter + daily extension badge

**Recorded:** 2026-11-13 (America/Chicago)  
**Product:** ReDown (with a possible common interface usable by Click2Cloud and future provider modules)  
**Status:** **OWNER IDEA / PROJECT DIRECTION ONLY — NOT AN IMPLEMENTATION REQUEST.** No application code, extension styling, migrations, settings, counters or cloud/provider behavior should be changed as a result of recording this note.

## Owner's intended experience

> The owner considers the current right-click cloud-save flow a highly promising near-production milestone and wants a restrained, beautiful counting experience: a small aesthetic **card/odometer at the top of the Shelf**, persistently displaying how many successful downloads/saves ReDown has completed **since the beginning**, and the tiny **number badge on the Chrome extension icon** showing **the total verified saves completed today**. The top counter must remain visible regardless of which Shelf tab is open. As new cloud providers are added, their successful work should automatically join the appropriate totals. Build this cleanly as reusable modules/submodules, not repeated ad hoc counters.
>
> **Do not implement anything yet. Preserve the working right-click application and existing data.**

## Two counters; one trusted stream of successful outcomes

### A. Lifetime verified completions — persistent Shelf header card

- Place a small, elegant, self-contained **counter card within the persistent Shelf header/top region**; it must stay visible on **every** tab/view (Remotes, File Explorer, Settings, History, Queue or future pages), not disappear during navigation or depend on active page rendering.
- Keep CSS **minimal**: restrained spacing, subtle border, proportional typography and optional understated mechanical-digit treatment consistent with ReDown's existing visual identity/odometer. No extra dashboard, large widget, excessive animations, layout shifts or persistent debug noise. Responsive at narrow Shelf widths; keyboard/assistive-technology readable.
- Display the **all-time recorded number** of **verified, successfully completed transfers/saves** since the earliest reliable counter origin. One successful independent item counts once; **not** clicks, queued jobs, failed/uncertain operations, attempted uploads or progress events.
- Owner's wording alternates between **“successful downloads since the beginning”** and **“every successful upload as more cloud providers arrive.”** Preserve this nuance: maintain explicit `direction` / `operationKind` in the future canonical event model, so upload/save and actual download can be counted separately or in a clearly labeled verified-completions aggregate. **Do not silently relabel an upload as a browser download, double count a remote copy, or assume all transfers have the same direction.** Before implementation, settle the precise display label and inclusion rule; the architectural default is verified completed ReDown saving work across providers, while retaining separate per-operation totals.
- Value is durable and survives closing/reopening the Shelf and Chrome/browser restarts and version upgrades while the browser profile data is preserved. No artificial reset at midnight. A new provider plugs into the common accounting seam without reworking the card.
- Do not invent lifetime history before the established initial timestamp; historical events lost before ReDown's recorder existed are unknowable. Show an honest “recorded since” basis where appropriate; support safe non-destructive migration and data recovery if separately approved.

### B. Daily verified saves — tiny Chrome extension badge

- Use the **existing Chrome toolbar/action badge** (small number over the extension icon) to show the **total number of new verified successful saves today**. It is a **calendar-day count**, not the lifetime number, a rolling 24-hour count, or a count of right clicks.
- Aggregate confirmed saves **across all supported providers**, using a single common counter source. A provider contributing today's verified completed save advances today's number exactly once.
- Reset logically when the user's **local calendar date** changes, including if the extension worker was asleep at midnight; on next wake/reopen show the correct current-day value immediately. Determine and document how timezone changes are handled.
- A small icon badge has limited width: plan concise display such as `99+` with the exact today's number available in an accessible tooltip or appropriate in-app detail. Do not add spammy notifications or full-screen dialogs.
- Preserve existing priority for genuinely important error/attention state and the extension icon's existing brief success/failure indication. Design an explicit conflict policy before implementation so numeric badges don't silently hide critical warnings.

## Existing ReDown implementation — inventory before proposing changes

This repository **already contains real counting infrastructure**; future work should **reuse and extend**, not replace:

1. `extension/transfer-counter.js`: `RedownTransferCounter.create(...)` already reads/writes a persistent `transferCounter` lifetime total and the profile-local `redownDailyVerified` value. The code deduplicates certain verified provider deliveries using delivery IDs, has provider-specific proof checks for Cloudflare, Google Drive, Dropbox and OneDrive, and treats calendar dates according to local time. Inspect actual installed behavior before declaring either counter missing or broken.
2. `extension/history-archive.js` provides IndexedDB history, while `transferHistory` retains a bounded compatibility window. **Do not rebuild all-time totals from only the last 50 records**, nor substitute UI-held volatile state for a durable counter.
3. `docs/SHELF_HISTORY_AND_SHARED_BRAND_IMPLEMENTATION.md` documents the existing persistent Shelf shell and History; `docs/NOTIFICATIONS_AND_TOOLBAR_STATUS.md` documents status/notification/icon behavior. Reuse both so the new card and daily number fit the same chrome.
4. `Ideas/IMPORTANT_MONEY_MACHINE_OVERDRIVE_GAMIFIED_ODOMETER_AND_CREATOR_SHOWCASE.md` is a separate optional gamification concept. This direction is deliberately **minimal and quiet** and must not automatically activate sounds, gambling-like animation, reward systems, streaks or elaborate effects.

**Important:** A source-level counter and a storage field are not proof that the requested persistent top card and daily badge are currently visible and correct in real Chrome. Audit the installed UX, event coverage, deduplication and known counter values first. Avoid migrating or resetting user storage to make numbers look clean.

## Modular, provider-agnostic design principle

Prefer a thin central verified-completion accounting interface, backed by the existing ReDown counter/archive rather than a second store:

```text
Cloudflare verified receipt ----+
Google Drive verified receipt --+
Dropbox verified receipt -------+--> existing verified outcome/accounting seam
OneDrive verified receipt ------+      |-- dedupe by durable operation/delivery identity
Future provider module ---------+      |-- persist lifetime total
                                       |-- persist/read today's calendar-day saves
                                       +--> tiny header card (lifetime)
                                       +--> toolbar action badge (daily)
```

- Provider submodules contribute **small, validated, privacy-safe verified completion records** with source provider, operation identity, completion timestamp and direction/operation type. Each adapter owns its provider-specific evidence; presentation code never guesses success from a click or `200` without the required receipt.
- **One authoritative accounting policy** controls increments, not every provider separately mutating two UI counters. Reuse ReDown's existing receipt checks and deduplication. Count one successful item once despite retries, restarts, replayed callbacks, duplicate events, or multiple Shelf windows.
- The UI consumes a read-only total snapshot and lightweight updates; there should not be a polling loop or expensive provider re-scan just to redraw a number.
- Prefer compact stored totals plus durable dedupe/source evidence consistent with retention. Distinguish new installs, existing profiles, older history and corrupted/unavailable persistence honestly. Do not change existing storage schema or historical totals until an explicitly reviewed migration exists.
- Extensibility matters: the same consumer could later show provider breakdowns, but the default UI has just **two numbers**, not a large analytics dashboard.

## Future acceptance criteria (when implementation is explicitly approved)

1. All Shelf tabs share one small, fixed-position-in-layout lifetime card in the **persistent header**, without page-specific duplicate cards, visual clipping, flicker or layout shifts.
2. Reloading the Shelf, restarting the extension worker/Chrome or switching tabs leaves the lifetime value correct and durable.
3. The Chrome icon's badge shows today's **verified successful cloud saves**, updating after confirmed completion; retries and duplicate callbacks never increment twice. Tomorrow is a new local-calendar-day number, but the lifetime total continues.
4. Cloudflare, Google Drive, Dropbox, OneDrive and a synthetic future provider use the same accounting interface; no changes to badge/card renderers are required to add another provider.
5. Failed, uncertain, pending, unverified, cancelled and duplicate attempts do not inflate either number; legitimate real downloads versus cloud saves remain distinguishable according to the final approved inclusion rule.
6. The numbers update without slowing right-click context menus, file saves, Shelf startup or background workers; counting failure must not corrupt uploads or misstate verified receipt truth.
7. Empty/new profiles show a truthful zero or established starting basis. Existing profiles retain historical counts and origin; do not manufacture missing older completions.
8. Accessibility, reduced-motion, light/dark theme, compact Shelf geometry, multi-window synchronization and numeric badge overflow are covered.
9. Verify with fixture/integration and **actual installed Chrome**, separate live provider receipts from simulated success. No code change or release claim is authorized by this idea document alone.

## Owner milestone context

The current owner-tested Click2Cloud repair baseline is `thanks-cohn/Click2Cloud` branch `codex/trash-silent-logic2real`, commit `0d50ab82c10555ae49d617b90be588057a1fa6b6`. The owner reports that working right-click saving and newly functional Trash controls make the product feel almost production-ready. The planned personal Git tag name **`milestone/a-sure-winner-base-0.1`** describes that *owner-observed interface milestone*, not an externally certified production release or a claim that the full test suite is green. This document is a future ReDown direction, not part of that frozen Click2Cloud checkpoint.

**No implementation. No reset. No new UI. No provider changes. No counters incremented by writing this note.**
