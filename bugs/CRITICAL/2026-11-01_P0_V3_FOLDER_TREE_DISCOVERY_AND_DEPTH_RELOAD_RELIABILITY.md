# CRITICAL P0: Right-click Setup hides existing folders until Browse + chevron; Depth 3 requires repeated reloads

**Reported:** 2026-11-01  
**Repository:** `thanks-cohn/REDOWN`  
**Branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P0, critical first-run trust and right-click reliability  
**Status:** OPEN, owner-observed in installed Chrome, **recorded only**. The reported timing and race hypothesis are not independently verified.  
**Scope:** V3 Right-click Setup, Cloudflare bucket/folder tree, Nested > Depth discovery and native Chrome menu registration.

This report preserves two distinguishable, related defects in the same setup/discovery flow. Neither is acceptable as a normal first-run experience.

## Symptom A: Existing folders are invisible until a nonobvious two-step sequence

**Observed sequence:**

1. Enter V3 **Right-click Setup** on an account with existing buckets and folders.
2. The tree does not show the existing folders.
3. A user must realize they need to click **Browse folders** first.
4. **Then** the user must click the little arrow/chevron at the left of the folder/bucket icon to see the folders.
5. Without knowing this hidden sequence, a new user with assets in R2 could reasonably believe their storage or folder data has disappeared.

**Expected:** Entering the editor and expanding a bucket/folder should discover and show its actual authorized children without a mandatory separate Browse action. If background loading is underway, show a scoped loading state. If no folders exist, if data has not yet loaded, if permissions fail, or if a request times out, show **different, accurate states**. Never present not-yet-loaded assets as an empty bucket. Manual Browse/Refresh may remain optional, not a secret prerequisite. Preserve cached results and search/selection state without silently treating a cache as cloud truth.

**Prior report:** [2026-10-31 V3 folder-chevron issue](../RIGHT_CLICK_V3_LAZY_FOLDER_ARROW_2026_10_31.md). This 2026-11-01 report elevates the user-trust consequence to P0 and records that the Browse-then-arrow sequence remains unresolved in the owner's current installed build. Prior source analysis was a plausible mechanism, not a verified live root cause.

## Symptom B: Nested/Depth menu updates appear only after multiple reloads

**Owner-observed setup and sequence:**

- Approximately **18 buckets** are in the user's configuration.
- **Nested > Depth** was set to **depth 3**.
- The owner clicked **Save** and then **Reload**, but the expected deeper native-menu levels did not promptly appear.
- They reloaded again. The deeper menu eventually became visible on **the third reload**.
- The owner suspects this may have coincided with REDOWN's own approximately **30-second refresh/reload cycle**, but **does not know** if that is the cause. The exact delay, concurrent operations, and root cause have not been measured.

**Expected:** A save/apply action must persist the selected depth and apply the newest eligible menu projection deterministically. If authenticated directory discovery is still in progress, surface an explicit **Saved / Discovering / Partial / Ready / Error** distinction, progressively reconcile verified folders and eventually register the *latest* depth generation without another manual reload. An acknowledged settings write is not proof that the native menu has been updated. Do not erase verified known menu branches while fetching, mistake a stale inventory for an empty folder, or let an older in-flight request overwrite the latest generation.

**Prior report:** The [existing bug inventory](../README.md) already tracks delayed Depth Save/Reload behavior and an in-flight inventory/generation-reconciliation hypothesis. The user's new **18 buckets, depth 3, third reload, possible ~30s overlap** observation is **not** proof of that hypothesis. It demands reproducible Chrome timing and generation evidence.

## What to investigate and record before any repair

1. Check the actual source commit, loaded extension version, service-worker lifecycle, account permissions and R2 folder-list responses, including pagination.
2. For a **cold editor cache**, measure what opening a bucket chevron does before any Browse click. Compare with Browse-first then chevron. Include mouse and keyboard ArrowRight/Enter.
3. Separate known zero-folders, not-fetched, loading, partially fetched, authorization error, timeout, and real empty results; preserve the user's unchanged remote assets.
4. Test **18 buckets at Depth 3** with deliberately slow/out-of-order child listings. Timestamp each Save, Apply, Reload, asynchronous scan completion, storage write, Chrome contextMenus update/create acknowledgement, and menu click/display. Capture generation IDs and stale-response suppression.
5. Test overlapping manual Reload with any background ~30-second refresh/alarm. Confirm whether that cadence actually runs and whether it causes the observed third-reload behavior; **do not assume it does**.
6. Repeat across service-worker suspension/restart, fresh and warm caches, multiple activated accounts, partially unavailable buckets, and rapid Depth 1-to-3-to-2 changes.
7. Keep diagnostic evidence redacted. Do not turn source hypotheses or mock-test success into verified installed-Chrome behavior.

## Acceptance criteria

- [ ] A user with existing assets can open Right-click Setup and see populated/clearly loading bucket roots immediately, without being led to believe assets vanished.
- [ ] A single click on a bucket chevron initiates a correctly scoped first-page folder listing when needed, then shows its children. A child-folder chevron loads that child's own children.
- [ ] No requirement to click **Browse folders** before expanding a row, including on a cold cache. Optional Browse can explicitly refresh/choose.
- [ ] Keyboard expand is equivalent; loading/error/empty/partial/retry are visible, scoped and accessible; existing values, focus and selection are preserved.
- [ ] **Depth 3 with 18 buckets** produces the correct verified eligible levels as soon as discovery finishes, without a second or third user Reload. Incomplete portions are visibly marked incomplete rather than shown as an authoritative empty tree.
- [ ] Save and Apply acknowledge separately: persisted configuration versus current Chrome native menu registration. The UI never falsely reports ready while native menu generation is stale or incomplete.
- [ ] Older scans, delayed callbacks, alarms and restart recovery cannot overwrite the latest selected mode/depth or remove unrelated previously verified menu destinations.
- [ ] Concurrency/back-pressure, pagination and rate limits are bounded. Do not run an unbounded 18-bucket recursive crawl merely on a single chevron expansion.
- [ ] Tests include fast/slow, reordered, failed, interrupted and partial requests, plus installed Chrome and real authorized R2 verification before closing.

## Existing related project context

- [Earlier folder-arrow report](../RIGHT_CLICK_V3_LAZY_FOLDER_ARROW_2026_10_31.md).
- [Bug inventory, P0 delayed Level Depth item](../README.md).
- [November 1 V3 menu setup and reliability checklist](../../NEED_TO_DO/11012026.md), especially P0.5, P0.6, P2.1, P2.4.
- [Agent onboarding and evidence limitations](../../AGENTS.md).

**Classification:** Critical owner-reported regression, **not** evidence of deleted R2 assets and **not** a verified cause. **This is documentation only.** Creating this file does not modify production logic, Chrome menus or Cloudflare R2 and does not mark the defects fixed.
