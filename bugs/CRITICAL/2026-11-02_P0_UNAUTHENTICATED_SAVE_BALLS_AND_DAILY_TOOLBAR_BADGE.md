# P0: Save balls launch while logged out; add verified daily toolbar count

**Date:** 2026-11-02  
**Branch:** `CONSOLIDATED`  
**Source repair:** Implemented. Targeted Node CI: **30/30 PASS**. Actual installed Chrome and live cloud-provider acceptance: **NOT TESTED**.

## Owner reports / requested behavior

1. Without a Cloudflare login, the right-click save balls still fly, misleading people into thinking REDOWN saved the item. **Never display a save-dispatch ball when the destination provider is logged out.** The ordinary sign-in behavior must still work.
2. Show a small numeric counter over the REDOWN extension icon in Chrome's top toolbar, so people can see how many downloads/saves REDOWN completed **today without opening the Shelf**. The number resets automatically each local calendar day.

## Cause

The right-click handler fired `launchSaveDroplet` immediately before the provider adapter could check authentication or complete a transfer. It simulated a file moving toward the Shelf even though no login was available. Its existing event `redownShelfImpact` is decorative arrival, **not** verified upload evidence.

## Repair

- Added `save-droplet-gate.js`. The page orb and Shelf arrival are denied before script injection unless the corresponding provider has an active signed-in state. Cloudflare needs a nonexpired stored access token without a reconnect requirement. Google needs a connected account. Dropbox/OneDrive additionally require the matching connected root/account **and persisted refresh grant**, not only a stale UI label.
- Gate runs **before** Chrome `scripting.executeScript` and before `redownShelfImpact`; it neither triggers login nor blocks provider login. The actual proven SUCCESS! animations remain guarded by verified provider receipts; the falling balls' shapes and flight code are untouched.
- Added `redownDailyVerified` storage, updated transactionally **with** `providerSaveReceipts` for each new verified Cloudflare/Google/Dropbox/OneDrive receipt. Provider IDs deduplicate a replay so badge and lifetime total do not change twice.
- Added `daily-save-badge.js`. It paints `chrome.action.setBadgeText` at worker startup and on successful verified receipt change; shows **0** when no verified saves occurred; colors adapt to Shelf theme; and uses a Chrome alarm at next **local midnight**, with cold-start fallback. Compact badge represents totals over 999 as `999+`. It never resets or rewrites the cumulative lifetime odometer.
- Corrected a daily-total string validation typo exposed by CI. Badge paints now read authoritative current durable state to prevent old asynchronous events drawing stale numbers.
- No new Cloudflare, Dropbox, Google or Microsoft permissions. Badge stores only a local date and numeric total, without names, URLs, source provenance or credentials.

## Important distinctions

- **Falling right-click save orb** = authenticated attempt, not proof of success. It must not fly while logged out.
- **Card SUCCESS!, permanent per-provider card count and daily toolbar badge** = verified new completed remote save only.
- **Theme selection celestial balls** are purely theme-switch decorations, not save attempt feedback, and are not changed by this rule.
- The toolbar badge counts **verified direct-to-cloud saves**, not ordinary Chrome files downloaded to the user's computer. Counts begin with new verified receipts after this feature is installed; don't claim historical events not provably tracked.

## Tests and acceptance

**Targeted automated CI:** `node --test tests/transfer-counter.test.mjs tests/daily-save-badge.test.mjs tests/shelf-save-feedback.test.mjs tests/consolidated-flat-providers.test.mjs`, latest passing run **30/30**.

**Installed-Chrome acceptance still needed:**
- Logged out of Cloudflare, right-click save: no orb and no Shelf save-impact ball, badge unchanged, ordinary login UI available.
- Logged in and perform a genuine verified save: one ball on dispatch, card SUCCESS! and provider card count advance only after verification, daily badge advances by one.
- Save fails / unsupported file / canceled login / queue only: badge and verified SUCCESS! unchanged.
- Test Google Drive, Dropbox and OneDrive with valid and invalid authorization states. Dropbox OAuth login itself remains separately tracked until verified.
- After Chrome worker restart and after local midnight, badge shows today's persisted count/reset accurately, while lifetime odometer remains cumulative.
- Preserve neon styling, source URL privacy, native flat provider menus and supported theme transitions.
