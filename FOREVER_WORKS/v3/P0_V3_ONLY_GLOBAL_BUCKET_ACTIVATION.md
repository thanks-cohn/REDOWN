# P0: V3 only, one global private bucket activation

31 October 2026, America/Chicago. Repository `thanks-cohn/REDOWN`, branch `codex/v3-parity-first-reconstruction`. Published implementation **`139711a9de89d289a2bb7d4c4887120149e8d3bc`**, identical tested code tree **`9142a639f84191a6d7d339d6f6e258fc58206750`**. Exact final verification is recorded in `global-activation-evidence/summary.json` and the latest handoff. Protected checkpoint tags are unchanged.

## Confirmed causes

The old Explorer handler in `extension/beta/explorer.mjs` captured `context()`, required a selected bucket and a per-bucket readiness check, asked about that one bucket, then called `request('prepareBucket',{source})`. Its R2 adapter sent `cfProvision` for that exact account/bucket. Changing selection could cancel the operation. The button therefore never enumerated other accounts or buckets. Provisioning saved profiles and Legacy-facing flags, but did not populate the independent `rightClickV3.destinations` store. A prepared Worker was not evidence of a V3 destination or acknowledged native menu.

`background.js` independently interpreted missing or non-`v3` `rightClickEngine` as Legacy, selected Legacy in both native projection and click resolution, and exposed a switch through Shelf Settings. V3 Setup consequently warned that it did not control Chrome. These are source-confirmed causes of the requested scope/engine defects. They do not establish the original installed-browser toolbar failure's trigger; the preceding emergency report remains authoritative about that uncertainty.

A separate source-confirmed privacy risk was found in the existing deployment default: a historical non-Explorer profile without explicit `publicAssetsEnabled` could inherit an implicit public-assets setting. Explicit global activation now passes `privateActivation:true`; deployment preserves only an already explicit public-assets opt-in. It never turns on public bucket URLs or changes R2 visibility. Existing explicit public settings remain as they were.

## Runtime and migration

V3 is unconditional in `buildMenus`, `resolveActiveRightClick`, snapshots, Apply and inventory maintenance. The service worker no longer imports `right-click-legacy.js`. Its source remains in Git, but the package dependency closure excludes it. A stale historical native mode checkbox is inert. `setRightClickEngine` is retained solely as a compatibility message: `v3` reconciles, any Legacy request fails explicitly. There is no Settings selector and no Legacy-active warning or success fallback text.

`ensureV3Only` runs before native rebuild, Setup snapshot and configuration transactions. First use creates a migration marker, V3 configuration and original recovery snapshot. Existing V3 records remain first. Legacy primary/additional shortcuts, supported nested paths and pre-v1 trees are imported with exact account/bucket/path ownership, custom labels, disabled state and stable order. Valid V3 parent relationships are retained; incompatible hierarchy is flattened with its original record recorded for review. Existing Simple/Nested preferences migrate to Simple/Narrow only when no V3 presentation preference exists. Existing V3 depth/presentation preferences remain intact.

Profiles, credentials, account identities, folders, History and original Legacy fields are retained. Invalid/unprepared/excess entries stay in `rightClickV3Recovery.original` and receive migration recovery records when conversion fails. Export destination recovery in Shelf Settings downloads menu data and original paths/labels, excluding profile tokens/Worker credentials. Setup displays a concise recovery notice when records need review. The original local snapshot is deliberately retained; exporting is a recovery aid, not an automatic destructive restore.

After reload, the marker prevents duplicate imports. Restoring a Legacy engine preference cannot change V3 routing. A reinstall with no Chrome storage has no retained profiles or credentials: the interface requires login and activation truthfully. Historical source, protected tags and unrelated documentation are untouched.

## Global activation and saved progress

The actual Explorer button sends sender-gated `activateAllBuckets` with an explicit activation gesture. It sends no selected account/bucket, source or prefix. `listCloudflareAccounts` enumerates the OAuth account inventory; `listBuckets` paginates each account's bucket inventory. Duplicate accounts and account/bucket tuples are collapsed. Repeated cursors and exhausted existing pagination bounds fail explicitly instead of silently claiming complete discovery. An unavailable account records an actionable account error while other accounts continue.

Activation reuses `preparedProfile`, the existing provisioning lock, Worker capability verification, profile storage and native registrar. Already healthy Workers are checked and reused. Newly prepared buckets use the existing private Explorer deployment behavior. Each successful profile is read back and matched before saving its activated identity. Each commit uses the existing destination transaction lane and stable account/bucket/profile identity. Existing shortcuts, labels and presentation choices are not rewritten by activation.

`rightClickGlobalActivation` stores a bounded resumable job and per-bucket progress. Duplicate concurrent requests share work. After a preparation slice, the existing MV3 alarm mechanism resumes pending buckets; worker startup also resumes an authorized saved preparation job. A changed/disconnected OAuth session stops further preparation. Interrupted account discovery reports failure and requires Retry rather than treating a partially enumerated account set as complete. This is resumable event-driven work, not a promise that MV3 stays awake continuously.

Successful buckets survive failures. Retry re-enumerates accessible accounts, skips previously successful preparation and retries failed buckets/account discovery and native registration. An unconfirmed Worker never becomes an activated destination. Failures stop automatic retries; users receive Retry Failed Buckets. Provisioning errors are summarized without dumping provider responses or credentials. Some provider-side deployment may have happened before a timeout; the existing stable profile/script identity and readiness checks govern retry.

## Eligibility, shortcuts and folder discovery

Three distinct stores retain distinct meanings:

| State | Owner | Purpose |
| --- | --- | --- |
| Configured shortcuts | `rightClickV3.destinations` | User labels, exact configured paths, ordering and enabled state |
| Activated roots | `rightClickActivatedBuckets` | Successfully prepared global save eligibility, separate from shortcuts |
| Deep participation | `rightClickV3LevelScopes` and existing inventory | Bucket-root folder discovery at the selected depth |

Simple retains its flat shortcut list. Narrow retains natural ancestry of configured shortcuts only. Both additionally offer a Buckets submenu containing activated roots, without injecting arbitrary discovered folders into those shortcut semantics. Activated roots have their own stable V3 IDs and exact-prefix save routing.

Level keeps actual cloud folder names and depth measured from bucket root. Newly activated buckets participate by default; existing explicit disabled participation is preserved. Disabling deep participation still leaves that bucket accessible through the root Buckets path. Missing/stale inventory now projects usable authorized roots immediately; resolution also supports those roots without an inventory record. Discovery proceeds independently through the existing bounded/resumable inventory machinery. Revoked profile authority is filtered at projection/click time rather than breaking unrelated valid buckets.

Native registration still uses the serialized parent-first registrar, real Chrome callbacks/`runtime.lastError`, access recovery and opaque application receipts. Activated eligibility participates in the receipt hash. Completion requires saved prepared profiles, persisted roots, root coverage in the relevant projection, `registered` state and a matching current application key. A dispatched request, profile name or partial native registration is not Activated. Native failures retain usable successes and offer retry.

## Button and accessibility

The existing toolbar geometry and V3 editor are preserved. Before login, activation is disabled and the existing LOGIN control remains the next step. After login, global readiness drives the persistent button even when no Explorer bucket is selected. A green illuminated border, restrained breathing and moving conic light identify the prerequisite. The prerequisite attribute suppresses unrelated tour/Refresh guidance shadows.

During work, beckoning stops, duplicate clicks are disabled, and the label reads Activating Buckets… with prepared/eligible counts when known. Verified completion removes prerequisite guidance and shows Buckets Activated. Partial/failed work shows Retry Failed Buckets and actionable status. A pending native Apply is not cloud success. Keyboard focus remains visible, labels remain text, and reduced-motion uses a static highlighted outline without animation.

## Verification and limits

**Actual results:** focused 140 pass / 0 fail, plus three targeted fixture regressions pass. Full reliability 679 pass / 69 failed names / incomplete, exactly the same failed names as the fresh pre-change baseline (662 pass / 69 failed names). Syntax, API registry and issue inventory pass; architecture freshness remains failed. No historical evidence hashes were refreshed.

See [focused log](global-activation-evidence/focused.log), [fixture regression log](global-activation-evidence/fixture-regressions.log), [exact summary](global-activation-evidence/summary.json), [full reliability report](global-activation-evidence/reliability-final.json), [browser boundary](global-activation-evidence/browser.json) and [protected tags](global-activation-evidence/protected-tags.txt).

The new combined tests evaluate the whole background with real local imports, actual message dispatch, native-menu callbacks, UI button code and deterministic provider mocks. They cover fresh V3 initialization, migration/recovery, restored Legacy preference rejection, all-account deduplication, real pagination helpers, selection independence, partial account/bucket errors, retry, concurrent requests, readiness rejection, native registration failure, saved-job continuation, private deployment defaults and reduced motion. Two native root clicks flow through the existing save handler to different destinations and its head-object completion verification. Provider ingestion/read responses in that test are mocked, not live R2 transfers. Existing V3 tests preserve Simple/Narrow/depth, editing, Apply receipts, inventory, Shelf/toolbar recovery and transport assertions.

Historical Simple-label tests now explicitly exercise the preserved Legacy reference model rather than expecting the live V3 registrar to expose Legacy IDs. Native migrated ordering is tested through the full V3 background. The Explorer fixture's activation assertion now expects a global request without a selected bucket. The isolated metadata fixture supplies the newly named public-assets value and asserts false. Historical evidence hashes/assertions were not refreshed to conceal failures.

No Chrome executable is available here. Installed-native gestures, real animation appearance, screen-reader behavior, Chrome reload/suspension timing, OAuth renewal and live Cloudflare transfers remain unverified. No live Cloudflare account was mutated. The existing pagination safety limits, 200-entry destination/participation store limits and 300-item native projection remain bounded. Oversized or incompatible state is retained/reported as partial or recovery work, never certified as all-bucket native coverage. Existing non-default jurisdiction/provider limitations are not replaced by a new provider API.

Manual acceptance in an authorized Chrome installation: log in with at least two accessible buckets/accounts; leave Explorer unselected or select an unrelated bucket; click once; inspect both native root actions; save an authorized disposable HTTPS asset to each and verify distinct bucket/key receipts and bytes; test a denied bucket then retry; reload mid-preparation and after success; restore old settings; test all three presentation modes and reduced motion; confirm bucket visibility and public URLs are unchanged. Reinstall with empty storage must request login/setup. Native-menu failure must retain local Manage access and never show Activated.
