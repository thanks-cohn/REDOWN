# REDOWN V3 — independently repairable Simple, Narrow and Depth menu modes

**Date:** 2026-11-02 • **Status:** architecture/design plan only, NOT yet implemented • **Branch:** `main`

**Owner directive:** Within the **existing V3 engine**, make **Simple**, **Nested → Narrow**, and **Nested → Level (Depth)** independently editable, saved, tested and repairable. A change made to Narrow must never silently rearrange Simple or Depth; a change to Depth must not rewrite Narrow's chosen paths or Simple's flat options. Keep the current owner-approved interface and Chrome native menu hierarchy. Reuse V3, **do not build a replacement engine**.

## Source inspection: current boundaries and coupling

- `extension/right-click-v3.js: presentation()` currently selects `{style:'simple'|'nested', nested:'narrow'|'level', depth:1..10}`. `project()` has already distinct `simpleProjection`, `narrowEntries`, and `levelProjection`, and `resolve()` routes according to the selected presentation. Preserve these existing functions and IDs whenever possible.
- **Coupling:** `simpleTargets()` and `narrowEntries()` both read `rightClickV3.destinations`; editing a destination in the current shared tree can therefore change multiple modes. `simpleTargets()` also reads activated buckets and default redown root. Meanwhile Level uses `rightClickV3LevelScopes`, activated buckets, and `rightClickV3Inventory` keyed to scope/depth. `activateAllBuckets()` currently adds activated roots to Level scopes; that is a cross-mode/shared-input mutation that must be made explicit and audited.
- `extension/beta/right-click-v3-ui.js` currently writes one V3 config via `saveRightClickV3`, one shared presentation via `setRightClickV3Presentation`, and Level scopes separately via `setRightClickV3LevelScopes`. Rapid save retries, background menu projection, cache invalidation and editor focus must stay reliable across modes.
- `extension/background.js` is the **sole authority** for native Chrome context menu registration and applies the selected V3 projection; **no separate Simple/Narrow/Depth Chrome menu engines**, duplicate registration or legacy right-click fallback.

## Three self-contained mode definitions

| Mode | Contents | Config owner | Authorized inventory |
|---|---|---|---|
| **Simple** | Flat user-configured, labeled destinations plus primary redown/Home behavior. No nested bucket folders. | `v3.modeConfigs.simple` | Explicitly selected saved destinations and authorized activated roots only |
| **Narrow** | Natural nested hierarchy formed **only** from paths the user expressly configured; does not auto-add arbitrary R2 folders. | `v3.modeConfigs.narrow` | Saved Narrow destinations, preserve their labels/ancestors independently |
| **Depth** | Actual authenticated R2 bucket/folder hierarchy to configured 1–10 levels, including folders not separately chosen by user. | `v3.modeConfigs.level` | Scope/bucket selection, depth and independently keyed discovered inventory |

The **active mode** is a small selector, e.g. `v3.activePresentation = {mode:'simple'|'narrow'|'level'}`. Switching modes changes **only** which saved mode snapshot is projected to Chrome, not the other two snapshots. Retain existing V3 representations and compatibility until migrations are verified; names here are proposed contracts, not new production keys to write before migration tests.

## Incremental architecture, with no destructive rewrite

1. **Read-only audit baseline:** capture and hash the current V3 destinations, default bucket, presentation, activated buckets, scopes, inventory, native menu plan and existing test receipts. Add a non-mutating projection comparison for all three modes on the same snapshot. Verify each can be shown without changing stored state.
2. **Introduce independent persisted snapshots inside V3:** one namespace per mode, each with `version`, `revision`, `destinations` or `scopes`/depth, plus shared read-only stable profile identities and activation readiness. On first migration, copy existing desired configuration to appropriate mode without deleting or resetting any user-chosen paths. Preserve original as a rollback checkpoint until parity proven.
3. **Explicit owner of writes:** Simple editor writes Simple config only; Narrow tree editor writes Narrow config only; Level's bucket chooser/depth writes Level config only. Validate the entire candidate and optimistic revision of that **mode**, not a shared `rightClickV3.destinations` revision. A write to one mode should not touch other mode data or their cache keys.
4. **Pure projection adapters:** call `simpleProjection`, `narrowEntries/narrowResolve`, or `levelProjection` with that mode's immutable snapshot and the same shared authorized Cloudflare profile state. Return the existing Chrome native menu entry shape. Preserve Home-last and provider hierarchy. Google/Dropbox/OneDrive remain direct single-level siblings and never inherit Cloudflare's nesting.
5. **Depth inventory isolation:** cache keyed by selected accounts, buckets, Level-scope revision, depth and actual credential/worker capability identity. Build inventory asynchronously without editing Simple/Narrow configurations. A failed inventory or insufficient permission affects **only Depth** and displays its truthful incomplete state; it must not erase or masquerade as Narrow paths.
6. **Activation boundary:** bucket activation updates authorization/readiness, not user intent in all modes. Do not automatically add every bucket to Narrow or Simple and do not override Level's explicit scope selection; if compatibility needs a one-time seed, make it a documented migration/opt-in step with its own explicit owner.
7. **Single native registrar and stable switch:** serialize presentation switching with a revision/token, project the selected mode, register exactly that plan, then acknowledge `Save Changes / Apply` only after Chrome confirms menu registration. On failure, retain all three configurations and show an honest Retry Apply. No ghost menus, internal diagnostics strings, stale “Unknown request”, or user-facing false applied state.
8. **Repair one mode at a time:** isolated unit tests and targeted fixes for Simple, then Narrow, then Depth; keep all others byte-for-byte stable. No replacement of Explorer, OAuth, R2 transfer engine, Shelf or GO TO while working on these configuration boundaries.

## Contract tests / acceptance matrix

- Configure **Simple A**, configure **Narrow B** with different nested paths, configure **Depth C** to 3 levels and selected bucket set. Switch A → B → C → A → B → C repeatedly. Each native menu must exactly match its own independently saved snapshot and **no mode should mutate the other two persisted hashes**.
- In Simple, add/delete/rename a destination; verify Narrow and Depth snapshots, Level inventory and previously configured mode labels remain byte-identical.
- In Narrow, add multiple paths per bucket, reorder/hide labels and delete one nested path; verify Simple remains flat and Depth still enumerates the complete configured scope to its chosen depth.
- In Depth, change 1→3→10 levels and bucket participation, introduce a private/inaccessible folder, pause the worker, fail enumeration, refresh cache; ensure Narrow/Simple remain unchanged and Depth failures are honest and bounded.
- On activation of an additional R2 bucket, assert that user mode choices do not silently expand. Verify all menus still route right-click saves to the **exact authorized account/bucket/key**.
- Concurrent two-window edits to different modes should both succeed and persist; concurrent edits to the same mode must use revision conflict handling without silent overwrite. MV3 restart should restore all three and the active selector.
- Check visual DOM focus, keyboard typing, Apply feedback, Chrome native menu registration and actual right-click saves in installed Chrome; retain previous checkpoint for rollback, not a forced overwrite.

**Safety:** This document is a proposed migration/repair plan, **not** an implementation claim. The other November 2 P0 is Cloudflare auth UI mismatch, documented separately. Neither mode editing nor activation may trigger OAuth grants or alter the Cloudflare session.

**Implementation evidence still needed:** source-level mode-specific projection golden snapshots, migration receipts, native menu integration tests and installed-Chrome acceptance.
