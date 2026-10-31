# Simple Cloudflare and toolbar branding repair

31 October 2026. Branch `codex/v3-parity-first-reconstruction`. Starting tree `33b6f9b`; paired urgent implementation in the preceding delivery commit (tested locally before docs-only rebases as `530389c`). The later delivery commit contains the bounded live-memory foundation and final evidence. Protected checkpoints are not modified. No provider mutation, release or telemetry was performed for verification.

## Source causes and repairs delivered together

`right-click-v3.js:project()` previously emitted configured Simple targets directly below REDOWN and prepended `v3:buckets`. The corrected Simple-only projector emits one Cloudflare surface. If a verified, prepared lowercase `redown` bucket is the sole target, `v3:provider:cloudflare` saves at prefix `''`. Once extra labels or activated buckets exist, it becomes navigation and `v3:provider:cloudflare:default` is the first actionable child, titled REDOWN. Configured deep prefixes remain flat labeled leaves. Provider action IDs use a reserved colon namespace that saved user destination IDs cannot occupy, preventing native ID collisions without rewriting existing IDs. Other activated bucket roots follow, deduplicated by account/bucket when already represented; duplicate display labels are disambiguated without rewriting saved labels.

Default account selection is fail-closed: reuse an exact stored `rightClickV3.defaultBucket` if valid, otherwise use the sole prepared account owning literal `redown`. Multiple candidate accounts without an established explicit default do not pick the first profile or Explorer selection: Cloudflare offers Setup instead. The existing explicit `cfSetupRedownQuick` account setup records that exact identity after verification. It is an existing extension command, not a new default-account chooser UI. This round does not add a new multi-account default selector; ambiguous users must establish the default through that setup flow. Unknown/unactivated bucket names do not acquire save authority merely because they were discovered.

The optional default identity survives ordinary V3 destination saves and migration. Existing destinations, parent relationships, labels, disabled choices and paths are untouched in storage. Normal Simple no longer adds Go Home/Manage utility rows; the registrar retains management access during application and removes it only after a complete healthy provider projection. Failures restore the minimal root/Manage route. Empty/unauthorized Simple exposes Cloudflare setup, not a fabricated save. The bounded overflow chooser lives inside Cloudflare. The UI remains Simple/Nested at the parent level, with Narrow or Level/Depth beneath Nested; no three-peer mode selector is introduced. Narrow retains its natural configured tree; Level retains authorized discovery. Native clicks still revalidate exact identity and verify the actual save receipt before History reports success.

`entry-bootstrap.js:launchIndication()` previously wrote `!` and arbitrary technical titles for accepted-but-unconfirmed readiness. Its 2500ms timer invalidated the generation, so late acceptance could be ignored without clearing a warning. Both were source-confirmed and reproduced by executing the complete worker with injected readiness failure and delayed completion.

The launcher now records those states locally and uses a shared narrow `toolbar-appearance.js` helper to restore `REDOWN — Your cloud companion`. It never writes a launch `!`, raw launch explanations or permanent error colors. A pending deadline frees a retry slot without discarding a late success from the same still-current attempt. Late success always attempts cosmetic cleanup; expired rejection still cannot trigger a late popup. Generation guards continue to prevent superseded attempts opening another interface.

Global and tab-specific stale launch titles/badges are cleaned on worker activation, preference change, tab activation, window focus, accepted/ready/unknown launches and popup recovery. Only the exact legacy launch `!` is cleared. Non-warning progress badges and custom progress titles are retained. The helper does not repaint icons: existing theme-aware transfer flashes, fade and restoration remain owned by `createToolbarFeedback`. Its short transfer titles propagate through previously branded per-tab overrides and return to the friendly title. Popup Retry failures are stored as a bounded latest local recovery record rather than painted onto the tooltip; the support export includes that fixed-shape record.

## Opening contract preserved

The Shelf request still runs synchronously during the delivered toolbar gesture, independent of provider state and menus. Accepted, slow or inconclusive Shelf requests never trigger another interface. Only definite failure requests the existing native attached action popup. If Chrome rejects `openPopup`, the tab remains armed for the next native click; no permanent opening preference is rewritten. There is no automatic detached window, tab or Options fallback. User-invoked Dashboard/Settings navigation remains. Native popup limitations and the original installed fresh-profile no-op remain documented, not declared conclusively repaired.

## Foundation phase 1 after the urgent fixes

The paired urgent changes passed 117 focused checks before this phase began. The next small phase fixes destructive interpretation of TTL/Depth and forced Reload:

- `rememberedNodes` keeps only records bound to the current profile/account/bucket/Worker authority. TTL and Depth become checking/projection inputs, not deletion evidence.
- Depth5→3→5 resurfaces known deeper nodes immediately. A forced partial/OAuth-failed Reload merges observations while preserving existing paths and frontier records. It does not manufacture deletions.
- New child records no longer inherit the parent's `listed` state, which could incorrectly skip unvisited child scopes.
- A newer Depth refresh waits for a stale in-flight generation and runs against the latest requested state. Stale provider results cannot replace the current generation. Real presentation/scope changes can start a justified check; worker restart alone does not start a full scan.
- Discovery still has 80-page/20-second/500-new-node round budgets and 300 native entries. Known-memory admission is bounded at 5000 nodes plus required newly participating roots; previously committed nodes are not truncated to the new per-bucket quota. At capacity, checking is explicitly partial. This is not an unlimited historical graph or a guarantee of every cloud folder.

Schema stays compatible with existing version2 inventory and schema1 `right-click.json`. Old cache bytes are not rewritten as accepted history. Current authorization always gates projection and click routing; expiry of an observation does not itself revoke a still-authorized locator. A remembered address is not proof the remote folder still exists. Complete listings do not yet create tombstones; deleting remembered paths awaits the transactional scope reconciliation phase.

### Explicit next-phase boundary

The full persistent-tree request is **not complete**. Transactional node/journal/page checkpoints, classified OAuth pause/resume and backoff, scoped Refresh Folder Listing UI, confirmed-operation delta hooks, durable ~30-second follow-up scheduling, immutable history and Daily/Weekly/Off controls remain separate phases. Existing frontier reuse is bounded best-effort, not atomic mid-page recovery. No journal or snapshot scheduler is invented here, so there is no duplicate-change-event or historical reconstruction claim. Daily remains the required default for the future history controls; this change neither adds nor changes such a setting. The existing menu registrar already avoids unchanged destructive rebuilds; broader delta efficiency remains planned. This bounded phase preserves useful progress without delaying the two mandatory urgent corrections for Time Machine.

## Chrome site-access audit

The owner-reported technical title and `!` are REDOWN-controlled and have been removed from launch presentation. Chromium's own `IDS_EXTENSIONS_WANTS_ACCESS_TO_SITE` is different. Its upstream resource description says it is the message shown on mouseover when an extension wants to run on a specific site, with text “Wants access to this site”. `setTitle`/`setBadgeText` cannot suppress that browser-owned security UI.

| Permission / host | Existing source use | Decision |
| --- | --- | --- |
| `activeTab`, `scripting` | `launchSaveDroplet` user-gesture effect; Hitomi explicit capture injection | Preserve capabilities; no broader page access added |
| `webNavigation`, `identity` | `cloudflare-auth.js` redirect events filtered to Chrome identity callback | Preserve OAuth callback/correlation behavior |
| `contextMenus`, `storage`, `sidePanel` | V3 registration/configuration and Shelf | Required local product surfaces |
| `alarms`, `notifications`, `downloads` | Bounded continuation, transfer notifications, explicit downloads | Preserve existing user features |
| Cloudflare API/dashboard, `*.workers.dev`, `*.r2.dev` | Authorized OAuth/R2/Worker flows and asset access | Preserve; no new grant or consent change |
| GitHub API | Existing gated repository/workflow integration | Preserve current Beta capability |
| `hitomi.la` | Existing explicitly requested gallery capture | Preserve domain-specific behavior |
| `http://127.0.0.1/*` | `beta/lab.mjs` authenticated optional local bridge | Existing optional feature dependency; no silent permission removal |

The manifest permission and host lists are byte-for-byte semantically unchanged; only its default action title changes. No On click/specific sites/all sites setting was modified. Optionalizing feature-specific permissions is a separate migration requiring product and compatibility review, not a cosmetic workaround. The local permission-string excerpt is retained with its upstream URL and hash.

## Validation and limits

See `evidence/simple-branding/` for urgent and final focused logs, full reliability, branch-baseline comparison, package hash and installed attempt. Tests execute the real domain, whole worker/imports, native-style popup dispatch and recovery DOM. They check default root routing despite a wrong Explorer selection, exact verified receipt, default-first promotion/demotion, flat deep labels, duplicate labels, ambiguous/revoked accounts, clean global/tab branding, retained transfer feedback, late success, rejected Shelf/attached recovery, tab/window/preference/restart behavior and non-destructive Depth/Reload races.

Actual native menu attachment, toolbar pixels/hover, separate Chrome profiles, transfer with live Cloudflare and the original fresh-profile incident are **unverified**. A standard unpacked load from the exact local package into disposable Chromium154 produced no REDOWN worker. Policy blocklists unapproved extensions, and this Chromium may also ignore ordinary load-extension flags. No alternate install/debugging switch or policy bypass was attempted. Installed/visual assertions are zero. Local mocks cannot prove Chrome-owned permission text disappeared; it must remain truthful.

## Final exact local results

Urgent paired phase: **117 passed /0 failed**. Final combined focused set, including the foundation and saved-order regression: **128 passed /0 failed**. Full `npm run reliability:check`: **720 passed /71 existing failed names /incomplete**. The starting branch report had709 pass and the identical71 failed names; zero added/removed failures. Syntax/API registry/issue inventory pass; existing Explorer architecture freshness fails. Audit packaging contains80 runtime files; release remains blocked. Installed/visual assertions: zero. Logs normalize trailing whitespace only; assertions/results are preserved.

The actual old bootstrap differential produces `!` and the quoted technical title for unknown readiness; the corrected worker produces an empty badge/friendly title with the same diagnostic codes. After a delayed success, the old bootstrap retains pending-warning state and drops acceptance evidence; the corrected version records API acceptance and remains clean. The domain differential demonstrates the old Buckets hierarchy versus the Cloudflare-only structure and exact root/deep-prefix routes. These use current shared fixture dependencies, not a pristine old packaged extension or installed browser.

### Current source anchors

- `extension/right-click-v3.js:191` — `function simpleTargets`.
- `extension/right-click-v3.js:214` — `function simpleProjection`.
- `extension/right-click-v3.js:113` — `function rememberedNodes`.
- `extension/entry-bootstrap.js:58` — `function launchIndication`.
- `extension/toolbar-appearance.js:6` — `function clean`.
- `extension/toolbar-appearance.js:26` — `function feedbackTitle`.
- `extension/background.js:1003` — `async function setupRedownQuickDestination`.
- `extension/background.js:2266` — `async function refreshV3Inventory`.

### Documentation arriving during delivery

Concurrent owner documentation through `0a47ead` was integrated without overwriting it. Its `NEED_TO_DO/fundamentals.md` preserves the two-tier selector and additionally specifies Cloudflare-first Nested presentation, immediate confirmed graph deltas, immutable dated anchors and independently stored user-authorized backup/recovery. Those broader new requirements are retained as controlled follow-up work; this round changes Simple and bounded live-memory retention, not Nested's existing root presentation, a transactional mutation journal, historical snapshots or external backup. No background backup/upload is authorized or performed by this implementation.
