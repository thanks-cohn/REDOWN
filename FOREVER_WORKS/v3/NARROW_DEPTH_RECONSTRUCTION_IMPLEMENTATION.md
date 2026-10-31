# Natural Narrow and participating-bucket Level implementation

30 October 2026, America/Chicago. Branch `codex/v3-parity-first-reconstruction`.
Start: `f78cd1f5064f326b127ab525e0d80a82b69a6220`. Read
[baseline](RECONSTRUCTION_BASELINE.md), [published audit](P0_MENU_MODE_AND_DEPTH_AUDIT.md)
and [reconstruction contract](P0_MENU_MODE_RECONSTRUCTION_CONTRACT.md).
This report supersedes the earlier menu presentation report's Narrow/Level semantics.

## Source changes and authority

`extension/right-click-v3.js` keeps Simple's original flat branch, eligibility,
array order, labels and exact configured IDs. Natural Narrow uses the same
eligibility first, then groups by exact profile/account/bucket and builds an
in-memory path trie. Explicit parents remain required ancestors under existing
validation; missing segments are inserted as presentation only. No configured
records are created or rewritten. Only configured actions resolve. Independent
disabled prefixes do not suppress unrelated enabled records; disabled explicit
parents still suppress their descendants. Custom labels survive. Equal-prefix
records remain separate actions; duplicate labels never merge identities. Empty
prefix shortcuts are custom-labelled actions inside the real bucket heading.
Buckets/siblings follow first eligible descendant's saved index. Synthetic IDs
encode JSON identity tuples; headings cannot resolve to writes. Configured
branches retain exact `Save here` actions. Projection limits still fail closed.

Level uses separate `rightClickV3LevelScopes={version:1,revision,buckets}` authority.
Missing storage means **no opted-in buckets**, including upgrades. An existing
subfolder shortcut never grants its entire bucket. Each selected entry binds
profile/account/bucket, stable ID and enabled flag. The existing Level header
contains native bucket checkboxes with explicit whole-bucket save scope wording;
there is no second destination editor. Unavailable scopes can be removed together.
Prepared profiles are eligible local choices, not claims of live provider rights.
No connected-account-wide automatic exposure or provisioning occurs.

`extension/background.js` validates scope changes behind the exact Explorer
sender gate and existing serialized transaction queue, compares scope revision,
and preserves the original destination schema. Snapshots are credential-free.
Scope changes invalidate inventory. Every native projection and click resolution
receives current scopes; opt-out/revocation rejects old actions with no fallback
write. Profile changes retain the existing inventory invalidation. Late reads
must still match profiles, scope key, depth, engine **and Nested/Level mode**.

## Discovery, depth and bounds

Every participating root is prefix empty at depth zero. Depth 1–10 exposes exact
cloud prefixes through that level. Existing REST delimiter listing supplies real
names, including unconfigured children and siblings. Custom shortcut labels are
never used to manufacture cloud directory names. Authorized parents remain
saveable through `Save here`; boundary leaves resolve to their exact prefix.

Retained safeguards: 500 inventory nodes including roots, 80 attempted page
reads, 20 seconds total, at most eight seconds per read, 300 native domain
entries and five-minute TTL. Failures count toward page cost. Malformed present
provider shapes and broken cursors produce partial status. No on-hover fetching,
new provider writes, permission changes or Worker deployment is introduced.

Traversal queues page/frontier work breadth first. Root nodes are reserved first;
a per-bucket node share prevents one broad first page from exhausting every
other bucket's inventory allowance. Native projection similarly reserves roots
before allocating descendants breadth first. Parent/actions are atomic and IDs
are parent-first. Shared disabled native warnings and Setup status identify
incompleteness. Setup also shows depth, known folders, roots checked and timestamp,
with the existing paged Explorer as the full navigation path. A checked root is
not a claim of complete subtree coverage.

Inventory version 2 binds scope revision/identities, adapter version, depth and
Worker locations. Label/order edits no longer force cloud reads. Nodes record
listing observations; inventory stores root observations, known frontier and
unknown-remaining state. **Frontier is diagnostic, not a durable resume protocol:**
manual Refresh restarts bounded discovery. More folders than the fair node/menu
allowance remain omitted; no complete bucket coverage is promised in that case.
A later durable index/cursor-resume feature is not implemented here. Credential
changes invalidate through the existing profile listener and publication check;
no credentials enter cache identities. Expired cache cannot resolve actions.

## Presentation persistence

The current dispatcher already contains the presentation handler; the historical
owner incident's cause remains unproven. Real UI/dispatcher/transaction tests now
cover acknowledged persistence and a lost acknowledgement after successful write.
The UI reconciles actual saved state via snapshot after saves, preserves a
rejected desired choice as an explicitly unsaved draft, and does not silently
select Simple on literal `Unknown request`. Explicit Reload reconciles to storage.
Concurrent storage changes cannot silently replace an outstanding draft.
No frozen historical assertions or evidence hashes were refreshed.

## Verification boundary

See [regression evidence](reconstruction-evidence/README.md) and
[GO TO report](HISTORY_GO_TO_INSTANCE_REUSE.md). Focused tests exercise actual
domain/controller/dispatcher/transaction code with synthetic storage/provider
pages, including tree interaction preservation. Installed Chrome and live R2
acceptance remain open; passing fixtures do not certify native menu appearance,
provider authorization or real saves. The original editor rendering function,
Explorer preview renderer, transfer ingest function, History rows and providers
remain unchanged, as recorded in preservation.json.
