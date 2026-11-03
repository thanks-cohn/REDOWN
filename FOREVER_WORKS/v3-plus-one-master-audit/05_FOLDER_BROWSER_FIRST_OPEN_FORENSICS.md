# First-open folder-browser forensics

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Root cause — reproduced in current UI

The owner report is confirmed in a controlled DOM using the real current UI script and synthetic message responses. `load()` fetches the V3 snapshot, expands account and bucket keys, then calls draw. It never fetches folder children. `folders` starts as a new empty Map. `cloud('', bucketGroup)` immediately returns when no cached root page exists. The bucket arrow's handler only toggles `expanded`; its fetch condition requires `key.startsWith('folder:')`, so bucket disclosure cannot populate that Map. Browse calls `browse(profile)` and creates the first cloud rows. Those rows do have `folder:` keys, so their arrows lazily request missing children. Source: [extension/beta/right-click-v3-ui.js:6–8](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/beta/right-click-v3-ui.js#L6-L8), [extension/beta/right-click-v3-ui.js:118–180](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/beta/right-click-v3-ui.js#L118-L180). Exact indexed anchors are also in source-census.json.

[Reproduction output](evidence/reproduction.log): first-open 0 requests / account+bucket only; bucket collapse+expand 0 requests; Browse 1 request / Art visible; Art arrow 2 total requests / Art/Child visible. This is LOCAL-REPRODUCED, not installed Chrome or a real Cloudflare account observation. The fixture does not need auth, provider writes, native registration or storage edits.

```text
load snapshot → expanded(account,bucket) → draw → root folders cache absent → no cloud rows
bucket arrow → toggle expanded → draw → same absent cache → no list
Browse → browse(p,'') → cfDestinationFolders → folders.set(p.id+':',page) → draw
folder arrow → folder key, missing cache → browse(p,exactPrefix) → draw children
```

IF a bucket's root page is absent, THEN its arrow does not load it. IF Browse succeeds, THEN discovered folder arrows can lazy-load below it. IF the folder cache already has a page, THEN arrow expansion reuses it without TTL checks. IF a list fails, THEN status shows the error and old pages remain; failure is not evidence of an empty cloud folder.

## State-by-state reconstruction

| Profile/data state | Current result | Missing proof / V3+1 contract |
|---|---|---|
| first install, no prepared profiles | “Activate a bucket in Explorer”; no roots | connection/loading state must distinguish unavailable from empty |
| prepared profiles, cold page | account/bucket roots expanded; saved aliases visible; no cloud page | auto list on bucket disclosure, with clear initial loading state |
| previously browsed same page | Map cache reused indefinitely | freshness/refresh/invalidation per scoped page |
| new Setup page / reload of document | Map recreated; durable Depth inventory is not injected into picker | optionally seed trusted remembered observations, mark stale |
| empty bucket | successful page has no folders; no explicit per-row empty indicator | “No subfolders” distinct from not requested/error |
| large bucket | one page; tree Load more appends root/folder values | per-page progress, deduplication and repeated-cursor guard |
| form Browse | separate chooser listing; cursor only reports enter narrower path | avoid a second incompatible browsing pathway |
| expired credentials | request error in global status; OAuth backend may refresh auth | localized retry/reconnect; no repeated consent per expansion |
| partial/cursor page | Map stores values/cursor; Load more issues next request | do not report completeness from partial list |
| multiple buckets | profile-prefixed Map key isolates pages | cancel stale response on profile/account/credential generation change |

No dynamic fixture here uses private names or live expiration. Empty/large/expired/multiple-bucket outcomes are SOURCE-CONFIRMED paths with installed acceptance OPEN. Two responses to the same page can race: browse has no abort controller, generation ticket or cursor-chain dedupe. Snapshot refresh preserves some drafts and scroll, but does not invalidate folders when credentials change. The UI request timeout is 30s; underlying remote work can complete later. A collapsed folder's in-flight request is not canceled.

## UX quality, separate from technical plumbing

Present: tree/treeitem/group roles, roving tabindex, aria-expanded, aria-selected, Arrow/Home/End/Enter handling, F2 rename, Delete, Space toggle for records, 700ms typeahead, focused-control restoration, in-form draft restoration, open-More restoration and activation-refresh scroll preservation. These are worthwhile local mechanisms, not a certification of screen-reader behavior or paint latency. A cloud row advertises children even when not known; global status is insufficient for loading/error/empty at that row. Full draw replaces outline content; ordinary browse draw has no explicit scroll snapshot. Focus can be restored while scroll still jumps.

Proposed minimum: roots appear promptly; expanding any bucket/folder immediately changes disclosure and starts a bounded immediate-child request only when missing. Use explicit page states `unknown/loading/partial/complete/error/stale`, inline loading/empty/error indicators and a Load more control. Key requests by connection generation + exact location + cursor. Ignore superseded results; abort where supported; preserve acknowledged observations on read failure. Refresh a branch, not the whole provider. A check creates an exact target alias; contextual name controls add further aliases. Simple and Narrow reuse this identical picker but commit separate per-mode alias state after an owner decision. Depth shows participating buckets + 1..10 control and need not expose the manual alias editor by default.

Acceptance recipe: new disposable profile; prepare a synthetic/disposable connection with authorization outside this audit; open Setup; keyboard-expand bucket without Browse; observe exactly one request and bounded loading state; collapse/reopen no duplicate; paginate; inject delayed old account response; switch connection; verify old response ignored; test empty/error/retry; keep focus and scroll; inspect screen-reader tree semantics; Apply; inspect native menu then exact destination receipt. No installed test was performed in this run. Proposed targets (not measured): immediate expansion feedback within 100ms, no full-provider scan prerequisite, request/pages bounded by explicit adapter budget, no loading spinner left indefinitely.
