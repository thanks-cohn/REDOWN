# CRITICAL P0: Nested/Narrow right-click Cloudflare action opens Dashboard Home instead of saving; default `redown` bucket is missing

**Reported:** 2026-11-01  
**Repository:** `thanks-cohn/REDOWN`  
**Branch:** `codex/v3-parity-first-reconstruction`  
**Priority:** P0, critical core saving and first-run provisioning  
**Status:** OPEN, owner-observed in installed Chrome, **recorded only**. Root cause and exact conditions not independently reproduced.  
**Scope:** V3, Nested > Narrow, native Chrome right-click menu, Cloudflare R2 default save and bucket provisioning.

## Owner's observation

1. Select **Nested** then **Narrow** in REDOWN V3 Right-click Setup.
2. Open Chrome's native context menu on an asset.
3. It shows a path resembling **REDOWN > Cloudflare setup**.
4. Selecting the Cloudflare entry **opens/navigates to REDOWN's Dashboard/Home**, rather than transferring the selected asset to the default R2 destination.
5. The expected lowercase Cloudflare R2 bucket named **`redown`** has **not been created**. The user expects first-run setup to create this bucket when the account is authorized and R2 is ready.
6. The result is a false or missing save path and a first-run flow that appears functional but cannot perform the core operation.

The owner specifically observed this in **Nested/Narrow**. Do not assume Simple or Depth were verified to behave the same way. Do not assert the bucket's absence in every R2 account from this report alone.

## Expected contract

- With a verified authorized Cloudflare connection and R2 available, REDOWN's default destination is the literal lowercase **`redown`** bucket at the root prefix `''`, not Explorer Home and not a similarly named UI destination.
- The authorized onboarding/provisioning flow must **create `redown` if absent**, verify that it exists and is usable, and make the corresponding direct-save action available. If creation or R2 enablement cannot be performed, expose the exact actionable setup/error state. Never pretend a save happened or redirect a clicked save into ordinary dashboard navigation.
- A deliberate **Setup** or **Open Dashboard** action, when necessary, must be clearly labeled as navigation and use its own independent menu/action ID. It cannot silently replace a save leaf or the provider-local default **Home** destination.
- Nested/Narrow is a hierarchy of *configured locations*; its default Cloudflare destination must resolve to the exact authorized provider/account/bucket/prefix independent of Explorer's currently selected bucket or folder.
- Do not create duplicate buckets, use public access by default, silently switch accounts, or treat a list-visible bucket as a verified writable destination. R2 unavailable, multiple accounts, authorization failure, and provisioning failure need explicit states.

## Reproduction and evidence to capture during repair

1. Fresh installed Chrome profile with REDOWN V3, Cloudflare authorized, and R2 enabled; confirm whether `redown` exists before the test.
2. Select **Nested > Narrow**, save/apply configuration, then inspect the native REDOWN context-menu nodes.
3. Click the Cloudflare/default entry for a permitted test asset.
4. Record the actual native menu ID, parent ID, label, saved V3 mode/submode, dispatch handler, resolved `provider/account/bucket/prefix`, and whether the action is save, setup, or navigation.
5. Check the authorized `redown` bucket existence/provisioning request, acknowledgement, any conflict or error, and the remote object read-back before reporting success.
6. Compare with **Simple** and **Nested > Depth** as separate regression cases. Repeat across a cold service-worker start and a menu rebuild.
7. Record redacted diagnostic receipts without leaking tokens, object URLs, private paths or credentials.

## Acceptance criteria

- [ ] Fresh eligible account with no `redown` bucket: authorized bootstrap creates **exactly one** lowercase `redown` bucket (or reports a specific blocked state), then verifies it before enabling the default save action.
- [ ] Existing `redown` bucket: no duplicate creation and no accidental public-access change.
- [ ] Nested/Narrow `REDOWN > Cloudflare` default save resolves to the verified `redown` bucket root and **saves the clicked object**, not opens Dashboard Home.
- [ ] Intentional navigation-to-Dashboard remains possible only via its own visibly labeled command with a distinct ID and dispatch path; provider-local `Home` means a **save destination**, never Explorer navigation.
- [ ] Save success is supported by exact object-key/remote read-back evidence; failure gives a truthful, actionable reason.
- [ ] Menu rebuild, worker restart, first install, existing accounts, multiple accounts, R2 not enabled, and unavailable permissions do not silently misroute saves.
- [ ] Installed Chrome + real authorized R2 acceptance is required; local unit tests alone cannot close the incident.

## Existing related project context

- [November 1 P0 Cloudflare and V3 work items](../../NEED_TO_DO/11012026.md), especially P0.1, P0.2, P0.6, P0.7.
- [Existing bug inventory](../README.md), including the Simple/default-save routing incident and native menu startup.
- [Unified agent onboarding and verification boundaries](../../AGENTS.md).

**Classification:** New critical owner regression evidence. **This file records the issue only.** No code change, production deploy, R2 mutation, or claim of repair was made by creating the report.
