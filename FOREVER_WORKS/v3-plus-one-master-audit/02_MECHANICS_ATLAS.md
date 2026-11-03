# Mechanics Atlas: event by event

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## The actual chain

```text
worker evaluation → original toolbar + BOOT → Shelf / Explorer Setup
→ snapshot of prepared profiles + shared destinations + presentation + scopes
→ draw account/bucket/destination rows (no initial cloud list)
→ Browse folders → REST page → page-local folders Map → draw discovered rows
→ add exact prefix + label → validate → optimistic local draft + session recovery
→ autosave message(expected revision) → serialized background transaction
→ IDB commit → storage.local mirror → rebuild combined native plan
→ update/create/remove callbacks → registered applicationKey receipt
→ explicit Apply confirms matching revision/scopes/presentation/key
→ native click ID → provider ownership dispatch or current V3 resolve
→ prepared exact account/bucket/prefix → Worker ingest → exact key/HEAD checks
→ History + notification + counter / Shelf feedback
```

This is implemented across [extension/beta/right-click-v3-ui.js:1–255](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/beta/right-click-v3-ui.js#L1-L255), [extension/background.js:2113–2560](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2113-L2560), [extension/right-click-current.js:1–124](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-current.js#L1-L124), [extension/background.js:2867–2959](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2867-L2959). The transfer arrow has real side effects; only synthetic fixtures were run. Setup autosaves and already calls rebuild on each persisted change. Apply is an acknowledgment gate, not the first moment any menu change becomes visible. Closing a rename form cancels that rename; canceling Add hides an unsubmitted form. Neither reverses already autosaved changes.

## Boundary ledger

| Arrow | Inputs → outputs / owner | Async and store | Failure, retry, stale behavior / survival |
|---|---|---|---|
| evaluate → toolbar | classic imports → listener / wrapper | immediate import; entryEvidence local queue | wrapper catches core error; toolbar remains if entry loads; no guaranteed provider handlers |
| toolbar → Shelf | gesture tab.windowId → open request / bootstrap | synchronous gesture call; 2.5s indication, bounded readiness | pending open is not permission for second surface; settled failure may arm attached popup |
| Setup → snapshot | exact Explorer sender → redacted prepared profiles / background | ensureV3Only restores durable data first | no account discovery here; storage failure shows status; no secret profile fields returned |
| snapshot → tree | config/profiles → rows / UI | page-local expanded Set and empty folders Map | known saved destinations are not a fetched cloud inventory |
| Browse → folders | account,bucket,prefix,cursor → immediate prefixes / background | one REST page of up to 1000 objects; OAuth layer deadline | Map updated only on success; old data remains on failure; no per-prefix request ticket |
| edit → draft | ID/path/label/enabled → next config / UI | clone, validate, sessionStorage retained draft | invalid input rejected; optimistic checkmark/label precedes acknowledgment |
| draft → commit | expected revision + whitelist fields → revision+1 / background | destinationSaveQueue and currentMenuLane | conflict rejects; next writer cannot silently overwrite old revision in this lane |
| commit → mirror | durable patch → compatibility local state | two transactions across APIs | IDB can succeed then local mirror fail; next restore repairs; no distributed atomicity |
| mirror → descriptors | config/presentation/inventory/profiles + provider states → parent-first plan | local reads and SHA-256 applicationKey | bad global V3 config can block contributions; root/manage established first |
| descriptors → native | ordered IDs and native presentation → callbacks | 5s per native call; ID cache local | update failure tries create; lost callback outcome unknown; no full reset; reorder can remove all destination rows |
| native → receipt | callbacks + key comparison → registered/superseded / background | local menuStatus, logical snapshot, IDB generation ack | persisted receipt is acknowledgment, not visible UI proof; crash can leave pending/stale receipt |
| Apply → Saved | expected config/scopes/presentation → matching current key / UI | waits up to 35s for save flags; each request timeout 30s | epoch change refuses old receipt; failure retains choices; partial coverage can still say Saved |
| click → exact route | stable native ID + freshly restored state → profile/prefix / domain | async durable restore and profile reread | current plan membership + leaf rule; stale/deleted/unready route null; never fallback to selected Explorer location |
| route → ingest | source HTTPS + exact prefix → key/bytes / background+Worker | noProvision true for V3; network POST | old Worker readiness fails rather than implicit repair; uncertain write never treated as harmless retry |
| ingest → confirmed result | exact returned key + HEAD metadata → verified receipt | Worker readback and independent local History write | key/size/etag/sourceUrl checks; no content digest proof; History can fail after cloud write |

## Extracted pseudocode, with actual limitations

```js
async function saveV3(message) {
  await ensureV3Only(); // can restore/migrate local state
  rejectUnlessExpectedRevisionMatches();
  validate(whitelistedDestinationRecords, preparedProfiles);
  await commitIDBThenLocalMirror(); // not atomic with the mirror or Chrome
  try { await rebuildCombinedMenus(); return savedAndMenuAcknowledged; }
  catch { return savedButMenuFailed; }
}
function click(id) {
  // Independent providers dispatch before Cloudflare handling.
  // Cloudflare resolver rebuilds current projection; stale IDs fail closed.
  return currentPlanHasLeaf(id) ? resolveExactPreparedTuple(id) : null;
}
```

## Failure and state machines

```text
UI: draft → saving → persisted + applyPending → applying → Saved
      ↘ failed/conflicted → retained + blocked → reload/reconcile or retry Apply
Registrar: base access → applying → projection → callbacks → registered
                                             ↘ failure → base recovery + failed
                                newer input → superseded → bounded rebuild
Directory: observed → remembered → stale → rechecked / partial / failed
                       (none of these alone grants provider write permission)
```

IF autosave succeeds but Chrome fails, THEN choices remain persisted and Apply must retry. IF a reply is lost, THEN timeout means outcome unknown and the UI can reread before retrying. IF input changes during Apply, THEN its old receipt cannot clear new pending work. ELSE a matching registered receipt marks the current bounded plan Saved, even when inventory completeness is false.

## Worked exact operation

Synthetic checked record `{id:'w',profileId:'p',accountId:'a',bucketName:'bucket',prefix:'Art/Photography/Weddings',parentId:null,label:'Wedding work',enabled:true}` is serialized once. Simple emits `v3:w` directly under Cloudflare; Narrow emits real Art/Photography navigation before `v3:w`. Both resolve `(cloudflare-r2,p,a,bucket,Art/Photography/Weddings)`. Neither the label nor current Explorer path participates in this tuple. A click produces one `saveResolvedRightClick` call, not one call per overlapping prefix. Cross-click deduplication and exactly-once writes across worker death are not supplied by that property.

Evidence: [all fixture inputs/projections/routes](evidence/observations.json), [reproducer](evidence/reproduce.mjs). Gallery capture is a separate explicit route: Hitomi gallery documents without srcUrl invoke capture, bounded 64 MiB buffering and retained queue/intents; generic HTML gallery uploads are rejected. Do not extend the ordinary URL HEAD proof to every gallery/capture or non-S3 path ([extension/background.js:2585–2729](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2585-L2729)).

The ordinary ingest POST awaits fetch and response.text without a local ingest-specific deadline in this function; do not extrapolate the listing/Chrome callback deadlines to it. HEAD/readback uses the Worker-call transport's separate bounds. UI request timeout does not cancel a committed write or native operation. A user retry after uncertain completion can create a second write; no exactly-once remote transaction is proved here.
