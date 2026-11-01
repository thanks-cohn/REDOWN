# REDOWN P0 source audit — Nested/Narrow Cloudflare setup opens Explorer rather than saving; default `redown` bucket absent

**Audited:** 2026-11-01  
**Repository / branch:** `thanks-cohn/REDOWN` / `codex/v3-parity-first-reconstruction`  
**Original owner report:** [2026-11-01 critical incident](2026-11-01_P0_NESTED_NARROW_CLOUDFLARE_MISROUTE_AND_MISSING_REDOWN_BUCKET.md)  
**Status:** OPEN. **Source audit only, not an installed-Chrome reproduction or live R2 verification. No production code changed.**

## Executive finding

**The behavior is supported by an exact, intentionally programmed route.** When Nested > Narrow has no eligible configured destination, `project()` falls back to Simple. If Simple also lacks a unique eligible default `redown` profile and extra destinations, the Cloudflare item is generated with the internal ID `v3:provider:cloudflare:setup` but the **visible title is merely `Cloudflare`**. The Chrome click handler then explicitly opens REDOWN Explorer's destinations URL instead of invoking remote save.

**Independently, REDOWN includes a correctly named `createBucket(accountId, 'redown')` operation, but that operation is only called by the explicit `setupRedownQuickDestination()` helper in the inspected background. The ordinary Activate Buckets path scans and prepares *existing* R2 buckets, and never creates `redown` if absent.** The inspected V3 editor, Explorer, and Quick Links UI have no `cfSetupRedownQuick` sender. Therefore a connected account with existing buckets but no `redown` bucket can remain without a default save route.

The observed navigation is **not** evidence that the distinct `redown-go-home` menu ID has been accidentally dispatched: the specific `:setup` path intentionally opens Explorer. Likewise, source code does not prove the exact runtime menu ID clicked on the owner's installed extension; capture that before closing.

## Source-backed trace

1. **No eligible Narrow destinations:** `extension/right-click-v3.js:34–60` projects only eligible saved V3 destination records and their ancestors; no generic bucket-root save is added merely because the bucket exists.
2. **Narrow falls back:** `extension/right-click-v3.js:228–246` uses `simpleProjection({...config,activatedBuckets:null}, ...)` when Nested/Narrow has no projected entries. This deliberately excludes activated-bucket sibling shortcuts from that fallback.
3. **Missing default becomes a setup ID:** `extension/right-click-v3.js:192–217` recognizes `redown` profiles by `bucketName==='redown'`, account/Worker URL/token, activated-status and an unambiguous or explicitly selected default. If there are no extra targets, the menu item uses `v3:provider:cloudflare:setup` with title `Cloudflare`. This is not visibly distinguished as navigation.
4. **Click bypasses save:** `extension/background.js:2803–2826` handles `:setup` by `chrome.tabs.create({url: chrome.runtime.getURL('beta/explorer.html#explorer-destinations')})`; only non-setup routes flow into `resolveActiveRightClick()` and `saveResolvedRightClick()`. There is a separate explicit `redown-go-home` navigation item at `background.js:2505–2517, 2809–2812`.
5. **Default bucket creation exists but is gated:** `extension/background.js:992–1044` implements `createBucket()` and `setupRedownQuickDestination()`: it lists account buckets, creates literal lowercase `redown` if missing, re-lists to verify, prepares a Worker/profile, saves `rightClickV3.defaultBucket`, and rebuilds menus. The related message `cfSetupRedownQuick` is accepted only with `confirmed:true` from the exact Explorer page (`background.js:2999–3003`). The inspected Explorer UI (`extension/beta/explorer.mjs`), V3 UI (`extension/beta/right-click-v3-ui.js`), Quick Links (`extension/beta/quick-links.js`), and Explorer HTML do not invoke it. **Do not claim no caller exists anywhere without an exhaustive full-tree search.**
6. **Activate Buckets does not create new buckets:** `extension/background.js:2180–2257` enumerates `listBuckets(account.id)`, calls `preparedProfile()` for those bucket names and registers their menu roots. It has no check/create for `redown`. The Explorer Activate action calls `activateAllBuckets` (`extension/beta/explorer.mjs:569–580`). The separate Explorer `+` button explicitly asks for a bucket name and performs manual creation (`explorer.mjs:568`).
7. **Worker preparation is not bucket creation:** `extension/background.js:1072–1112` deploys a Worker bound to the `bucketName` supplied. `preparedProfile()` (`background.js:1631–1647`) reuses/prepares a Worker profile; neither independently creates an absent R2 bucket.
8. **Readiness is partly projection-based:** `simpleTargets()` reads locally stored profile identity/Worker URL/token, not a fresh R2 bucket-existence response. This can show `:setup` on a stale/missing profile even if the bucket exists, or can show a default leaf for a stale saved profile. Live save-time Worker health/read-back is a separate gate.
9. **Stale explicit default is an additional fail-closed case:** if `config.defaultBucket` exists but does not match the remaining ready profiles, `simpleTargets()` does not fall back to a single different profile. That avoids silently switching accounts but must surface a user-readable re-selection/recovery path.

## Why existing automated tests have not caught the user experience failure

- `tests/right-click-v3.test.mjs:23–25` explicitly asserts `v3:provider:cloudflare:setup` for an empty destination store.
- `tests/global-bucket-activation.test.mjs:27–33` explicitly asserts fresh-install V3 still has the `:setup` menu node.
- `tests/simple-cloudflare-branding.test.mjs:11–19, 26–32, 43–51` tests successful `redown` root saving with a **pre-existing synthetic ready `redown` profile**, plus ambiguous-account fallback. It does not prove first-run bucket creation or an actual Cloudflare transfer.
- The examined suite contains no integrated test showing **authorized connected account with existing non-`redown` buckets → create/verify `redown` → select default → Nested/Narrow click produces a remotely verified save**.
- These are code/test inspection findings; **no tests were executed during this GitHub connector audit**.

## Root cause assessment

| Claim | Evidence | Confidence |
| --- | --- | --- |
| No Narrow entries + no ready default yields the `:setup` item | Exact projection path | **Confirmed in source** |
| `:setup` click opens Explorer rather than saving | Exact context-menu dispatcher | **Confirmed in source** |
| Existing bucket activation does not create `redown` | Exhaustive activation-function read, separate create helper | **Confirmed in inspected path** |
| Existing quick creation helper creates and verifies `redown` when invoked | Exact `listBuckets/createBucket/listBuckets` sequence | **Confirmed in source, not live provider** |
| Owner's installed click followed this exact `:setup` ID | Report matches source but no click receipt | **Highly plausible, unverified live** |
| OAuth/R2 permissions, account ambiguity, profile health, or service-worker state were the real trigger for missing default | Need actual account and Chrome diagnostic receipts | **Unknown** |
| Cloudflare really lacks `redown` in the intended account | Owner observed absence; no live R2 read granted | **User report, not independently verified** |

## P0 correction requirements (implementation proposal only)

1. **Provision on explicit, authorized onboarding/activation, not an accidental first right-click.** When an account has authenticated and R2 is available, offer/perform the user's explicitly approved default-bucket setup: check exact lowercase `redown`, create once only if absent, verify existence, provision/health-check the Worker, then commit the exact account/profile/default identity. Handle multiple accounts with an account choice rather than guessing. Never silently enable R2 billing, public access or cross-account storage.
2. **Make setup look like setup:** if the verified default cannot save yet, show an explicitly named `Set up Cloudflare saving…` item, separate from a true `Cloudflare` save leaf. Do not use a plain save-looking Cloudflare label for a navigation command. Errors must distinguish R2 unavailable, OAuth scope, default missing, Worker unhealthy, ambiguous accounts and failed registration.
3. **Preserve Narrow semantics:** configured custom directories and their ancestors remain Narrow; the verified default `redown` save route is always represented by the provider-local `Home` leaf (or direct provider save when truly one eligible target), without inadvertently showing every activated bucket or converting `redown-go-home` into a transfer command.
4. **Verify before declaring ready:** check Cloudflare R2 bucket existence, Worker/binding readiness, actual Chrome native menu registration and a save-time remote object read-back independently. No automatic replay of uncertain bucket creation, no duplicate buckets, no false success.
5. **Expose a bounded first-run state machine:** `Not Connected → Authenticated → R2 Available → Default Bucket Check → Create/Reuse → Worker Ready → Menu Applied → Save Verified`, with explicit blocked/retry/partial states. One Click Activate Buckets should not falsely say default saving is complete when `redown` still needs creation.

## Mandatory regression matrix

- Clean authorized account with zero buckets, one unrelated bucket, and 18 unrelated buckets, each with no `redown`; establish exactly one authorized default, then save from Nested/Narrow.
- Existing `redown`, unprepared `redown`, unhealthy Worker, insufficient R2 permissions, R2 billing/activation unavailable, OAuth expired, API create accepted but follow-up list fails, and ambiguous account selection.
- Narrow with zero configured destinations, one custom path, several nested custom paths, and deleted/disabled saved paths. Confirm the default destination stays available under the intended presentation rules.
- Simple and Depth separately; no inadvertent regression of valid native IDs and prefix resolution.
- Cold MV3 worker, reopen/reload, browser restart, overlapping activation/rebuild and half-finished provisioning. Capture actual menu ID/title/route, persisted default identity, R2 lookup/create response, Chrome registration acknowledgement, and remote save/read-back receipt.
- Verify non-save setup labels, exact menu action identity and that `redown-go-home` remains navigation only. Validate live installed Chrome and authorized R2 before marking fixed.

## Outcome

**P0 remains OPEN. This audit confirms a code-level explanation and a missing default-bucket provisioning integration in the inspected flows, not a completed repair or live browser/cloud verification.** Fix the onboarding/provisioning-to-menu handoff and unambiguous menu affordances; do not merely change an ID string or add retries.
