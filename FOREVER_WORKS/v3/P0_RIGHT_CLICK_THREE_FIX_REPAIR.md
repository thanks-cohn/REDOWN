# P0 right-click three-fix repair

31 October 2026, America/Chicago. Branch: `codex/v3-parity-first-reconstruction`.

Implementation commit: **d153357e854936e6de89182aa999015c4ebba893**, tree **bf34247bd14656644191e4ec923b30cd02fd4458**, identical to locally tested code commit `b9fd9b60cf7af0eb09b88c433812a4eafcd641ec`. Documentation delivery follows this implementation commit; its SHA is in the final delivery response and branch history.

## Source-confirmed cause and repairs

`RedownRightClickV3.discover()` records sanitized read failures. `levelProjection()` includes them in diagnostic warnings and a completeness summary. `background.js:buildMenus()` previously transformed those warnings into the disabled `redown-v3-inventory-status` native entry. `right-click-v3-ui.js:menuFeedback()` independently appended the exact Depth / known folders / bucket roots / Explorer summary after Save.

Both presentation conversions are removed. Domain warnings, summary and `complete:false` remain in `rightClickV3Inventory` and `rightClickMenuStatus`. Discovery records a sanitized success/failure through the existing Debug Mode runtime observer (`api.read`, `OK` or `UNEXPECTED_RESPONSE`), without URLs, tokens or private paths. Registration failures retain the existing actionable Retry Apply feedback. Reload remains the explicit inventory retry/refresh control. No CSS hides diagnostic text, no replacement warning entry is introduced, and valid discovered destinations retain exact routing.

Production files changed:

- `extension/background.js`: snapshot persistence/restoration, scoped invalidation, incremental discovery input, native warning removal and independent registration acknowledgement.
- `extension/right-click-v3.js`: resume existing inventories/frontiers and retain per-bucket completeness/freshness metadata under existing budgets.
- `extension/beta/right-click-v3-ui.js`: quiet routine feedback, revision/receipt-based Apply, independent of scan completeness or TTL.
- `extension/beta/right-click-v3.css`: contained perimeter shimmer and reduced-motion/focus rules.

Tests changed only in `tests/right-click-v3.test.mjs`. Existing editor rendering, transfer implementation, Explorer, Shelf, Split View, Legacy engine and protected checkpoints are untouched.

## Logical `right-click.json`

Persistence location: **`chrome.storage.local['right-click.json']`**, an object, not a packaged file. Existing `rightClickV3Inventory` remains the working inventory; no second menu engine is added.

Schema version 1 contains:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Snapshot envelope version, currently 1 |
| `configurationRevision` | Existing destination-store revision |
| `presentation` | Existing style, nested mode and depth |
| `buckets` | Currently authorized participating bucket identities |
| `destinations` | Configured identities, exact prefixes and enabled state |
| `inventory` | Existing version-2 inventory: safe folder nodes, key, timestamps, observations, warnings, completeness and frontier |
| `projectionGeneration` | Last projection receipt's opaque application key |
| `appliedGeneration` | Acknowledged registered generation, otherwise null |

Per-bucket observations include checked root, known-folder count, observed timestamp and completeness within the requested depth. Frontier entries retain profile identity, exact prefix, cursor and seen cursors. No provider token or credentials are copied into the snapshot. The existing inventory key contains bucket identities and Worker endpoint, not the profile token. Application receipts are SHA-256 values over authoritative inputs, never plaintext credentials.

### Restoration and invalidation

Before registration, restore a fresh matching snapshot if the working inventory is absent. The configuration, current profiles and selected scopes remain authoritative. Snapshot destinations never overwrite current configuration. Menu projection and click resolution independently require current authorized profiles.

Unchanged fresh inventory avoids discovery. At ordinary five-minute maintenance, completed fresh bucket observations are reused; unfinished nodes and stored pagination continue under existing limits. Reuse lasts at most one hour from the root observation, then a bounded scan refreshes it. Explicit Reload forces a fresh bounded scan. This bounds stale listings without re-enumerating all folders on every Save.

Adding/removing a participating bucket reuses only matching unchanged bucket tuples. Depth changes invalidate depth-dependent observations. Authorization/Worker/token changes drop affected profile nodes and the redundant snapshot before rebuilding, while retaining unaffected bucket observations. Restored broad inventories are allocated per bucket so a newly selected root still gets capacity.

The existing single-flight discovery promise prevents concurrent scans. Existing latest-input checks reject responses after scope, engine, mode or profile changes. Snapshot writes use a small serialized lane and read current state when executed. Registration and configuration retain their existing serialized lanes. MV3 startup rebuild restores persisted data; the existing Chrome alarm provides later bounded work. No assumption of an indefinitely running worker is made.

Budgets remain: depth 1–10, 500 inventory nodes, 80 listing attempts and 20 seconds per batch, 8-second individual read deadline, 300 projected destination entries. Partial inventory remains explicitly partial. A registered bounded menu does not certify exhaustive cloud coverage.

## Save/Apply and shimmer

Existing autosave and `applyRightClickV3` transaction remain authoritative. Apply waits for pending persistence, checks destination/scope revisions and presentation, invokes the existing serialized native registration pathway and requires its callback acknowledgements plus a matching opaque application key. Apply no longer forces a new inventory traversal.

Native registration now records `state:'registered'` when the current bounded projection is acknowledged, independently of its inventory `complete` flag. Superseded receipts and native failures cannot produce Saved. Failed persistence/application retains intended settings and offers Retry Apply. New edits arriving during an application retain the existing edit-epoch protection. Repeated clicks remain guarded and disabled during application.

The button shows Applying… and a one-pixel masked conic highlight traveling around its existing rounded perimeter. It uses no dependency, size change or flash. Saved/Applied feedback requires acknowledgement. Background discovery alone does not mark configuration dirty or extend the animation. Existing live status text supplies accessible success/error feedback; explicit focus styling and a static reduced-motion highlight remain available. Selection and scroll are not redrawn by Apply.

## Verification and evidence

- Focused `node --test tests/right-click-v3.test.mjs`: **56 pass, zero fail**.
- Final `npm run reliability:check`: **650 pass, 69 failed names, incomplete**. Exactly the same failed names as the preceding published split/save evidence, with no added or removed failed names. Syntax, API registry and issue inventory pass. Architecture freshness still fails. This is not a green full suite or release certificate.
- Onboarding describe/start-guide/registry/issues/readiness commands completed. `git diff --check` passes.
- Installed Chrome smoke: **blocked, `CHROME_NOT_AVAILABLE_ENOENT`, zero assertions**. No live Cloudflare verification or cloud mutation performed.

Evidence: [focused tests](three-fix-evidence/focused.log), [full reliability report](three-fix-evidence/reliability.json), [failure-name comparison](three-fix-evidence/comparison.json), [installed Chrome result](three-fix-evidence/installed-chrome.json).

Tests retain Simple/Narrow/Level, labels, exact routing, tree interactions, revisions, races, stale reads, time/page/folder/menu budgets, sender gating and failed native callbacks. New assertions cover snapshot restart without provider rescan, failed-child resume without relisting a completed root, affected-bucket reuse, revoked destinations, absence of native diagnostic rows, retained diagnostic warnings, truthful partial-inventory registration, reduced-motion/focus CSS and capacity for new buckets. Two prior test expectations intentionally required the removed warning row or conflated incomplete coverage with failed registration; those are replaced with stricter separation checks, retaining `complete:false` and actual warnings. Historical evidence files and frozen expectations outside this changed behavior are unchanged.

## Remaining limitations

Real Chrome native callbacks, MV3 interruption, keyboard/screen-reader behavior and shimmer appearance still require installed-browser acceptance. CSS assertions are source checks, not visual proof. Live provider pagination, changing folders and invalidated provider cursors require real-account verification. A crash during a bounded batch can repeat that batch; persisted completed batches resume safely. Provider listing caps can permanently leave native menu coverage partial; Explorer remains the full paged browsing surface. Runtime Debug traces are redacted and collection-gated; detailed sanitized inventory state remains local. An hour-old folder may have moved or disappeared, so existing transfer authorization/exact-object checks remain necessary.

Protected tag objects remain `BASE-v3` = `322358123d78cebad75ee4503f30c33cfa34459c`, `V3-MENU-MODES-BEFORE-HISTORY-REPAIR` = `cff7020054885e95a3f313cacd38f37218f9e735`, and `V3-BEFORE-NARROW-DEPTH-RECONSTRUCTION` = `20612eb8f181abfe087be8d28995d983cf4c2e1e`. No tag update is part of publication.
