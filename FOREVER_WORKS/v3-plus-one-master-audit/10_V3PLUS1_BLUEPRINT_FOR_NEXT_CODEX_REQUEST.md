# Blueprint for a separate V3+1 engineering request

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Proposed sequence, no implementation in this audit

Use the working V3 as a preserved baseline. Do not begin with a wholesale rewrite or rename arbitrary existing modules as S3. The first engineering request should be small enough to prove rollback before adding a vendor.

1. **Freeze reviewable contracts and baseline.** Pin source and route manifest, retain protected checkpoint/tag hashes and all historical evidence. Decide mode A/B/C, explicit default-root alias behavior and provider independence boundary. Classify/fix harness assumptions in a separately reviewable test-only change if authorized; do not “green” stale expectations without product review. Acceptance: reproduce current supported route cases and explain every failure; installed baseline recorded in an administrator-approved environment.
2. **Repair authoritative write boundaries before schema migration.** Inventory every direct local writer identified in chapter 06. Make one current-state owner and a recoverable compatibility mirror; version the change. Acceptance: migration/default update/profile invalidation all survive IDB success + mirror failure, restart, stale revision and concurrent tabs; unchanged 17 of 18 buckets survive one edit; no unrelated source/behavior change. Rollback: previous schema remains readable or an export/validated reverse route exists.
3. **Neutralize registrar contribution coupling.** Define descriptor/action ownership and per-provider last-valid plan. Remove inter-provider predecessor/compose dependencies behind compatibility tests, preserving native IDs and routes. Acceptance: import/fragment/list failure of any S3 or non-S3 engine cannot delete others; root/manage and Shelf survive; Chrome callbacks/reorder/restart are truthful. Rollback uses prior valid contribution, not global removeAll. Native API atomicity is not promised.
4. **Introduce S3 identity/adapter seam behind existing behavior.** Wrap Cloudflare's real REST + Worker implementation with its exact limitations; inject adapter for listing/resolution without changing menu algorithms. Private credential owner stays separate. Acceptance: fictional second and third connections with same-named buckets prove isolation, cursor/error capability behavior and no algorithm edits. Preserve non-S3 auth/state/dispatch untouched.
5. **Version mode-specific alias configuration.** Migrate current destination IDs/selections into initial Simple and Narrow presentation records with explicit migration provenance. Keep shared immutable cloud location identity and separate scope/index generations. Acceptance: current route parity before intentional changes; per-mode independent label/selection/order; same-path aliases, same-label warnings, selected parent Save here, explicit root alias decision; old configs/export backups not destroyed. Rollback: old baseline config retained until acceptance.
6. **Repair the picker journey.** Reuse one lazy picker component across Simple/Narrow and a minimal participation+depth UI for Depth. Expand bucket/folder requests automatically; bound pages/time; add branch loading/empty/error/stale states and generation cancellation. Acceptance: no Browse prerequisite, no whole-provider scan, keyboard/typeahead/focus/scroll, cold/warm/multiwindow/auth/partial scenarios from chapter 05. No provider mutations from check/rename/preview.
7. **Evolve existing CURRENT index only as required.** Separate index knowledge from UI aliases, add bounded retention/replay recovery and versioned export policy. Keep observations on partial failure, no deletion inference or stale-write authorization. Acceptance: 5→3→5 restart, per-connection frontier and scope changes, crash/backup+journal recovery, quota/pruning, verified external restore. No new database unless a measured requirement cannot fit existing stores.
8. **Authorize installed/provider acceptance separately, then optional additions.** Approved Chrome tests cover real native visibility, startup, right-click menu order, exact one-click route and MV3 suspension. Disposable provider acceptance verifies exact key/bytes/metadata and History/counter outcomes with uncertain writes. Only then consider real MEGA S4 or another vendor and optional S3 Explorer/alternate branches. No production account changes or deployment by implication.

## Proposed ownership contracts

| Boundary | Owns / persistence | Must not own / allowed calls | Failure and proof |
|---|---|---|---|
| entry/Shelf/BOOT | original gesture opener, bounded local readiness | no cloud discovery or V3 module prerequisite | injected core fault + approved installed recovery |
| provider connection | private auth, endpoint, permissions/capabilities/scope generation | no mode labels or native writers; expose opaque refs | revoke/switch/list failure affects only connection |
| location index | exact scoped observations/frontier/completeness and history | no credentials/provenance or alias approval | partial scans retain data; transactions/restart/restore |
| picker | visible rows, focus, page requests, draft selection | no provisioning or global scans; call read adapter | first expand/late response/page/error UX tests |
| alias config | stable action IDs, per-mode selection/name/order, optional branch IDs | no cloud folder creation; refer canonical locations | duplicate/overlap and migration roundtrip |
| Simple/Narrow projection | pure descriptors and owned route references | no network, storage writes or auth | deterministic input-output fixture parity |
| Depth orchestration | bounded discovery + pure projection | no permanent execution promise or unbounded hover read | timed budget/page/cursor tests + restart |
| neutral registrar | namespace collision checks and native acknowledgment | no provider credentials/listing/Explorer initialization | contributor failures, callback loss, reorder/native visibility |
| route + transfer | current authorized exact target and verified receipt | no label routing/fallback default or replay of uncertain writes | exact prefix + scope switch + provider readback |
| History/feedback | independently recorded verified/uncertain outcomes | never upgrade started/acknowledged to successful | provider-specific receipt, stale account and duplicate pulse checks |
| preservation/debug | sanitized observations and explicit unknowns | no credential extraction or auto-promoted intent | schema validation, untouched frozen prefixes |

## Stop conditions for the next request

IF scope/identity approval is unsettled, THEN do contract and fixture work only. IF schema migration cannot roundtrip current routes and restore backup, THEN do not switch the runtime reader. IF native/provider proof is unavailable, THEN report local progress with an open release gate. ELSE advance one reversible stage after its acceptance evidence, without bundling unrelated provider or visual work.

The smallest next request should cover stages 1–2 only (baseline/harness classification and all-writer durability), with an explicit independent follow-up for neutral registrar and adapter seam. Owner may choose a picker-only urgent fix instead, but it must preserve shared current semantics and avoid prematurely introducing independent mode schema. Recommendations here are not approved implementation work.
