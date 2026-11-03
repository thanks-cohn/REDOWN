# S3 adapter readiness and independent provider engines

Source baseline: `1f85185f87c52b13e01c7c9069464668c2ad47d0`. Audit date: 2026-11-02 (America/Chicago). Documentation/evidence only. [Start here](00_START_HERE.md).

## Actual baseline: Cloudflare-specific, not an installed S3 abstraction

`prepared` accepts only `type==='cloudflare-r2'`, exact profile/account/bucket and truthy Worker URL/token. The domain groups by those tuples, inventory key includes Worker endpoint, and CURRENT namespace literally starts cloudflare-r2. Listing uses Cloudflare REST through cfFetch; ingestion delegates a prepared bucket Worker and its protocol. There is no loaded MEGA S4 adapter, generic endpoint signing service or provider-neutral S3 credential store in this graph. This is MISSING relative to the owner's future adapter engine, not a finding that Cloudflare's existing Worker model is broken. [extension/right-click-v3.js:7–8](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-v3.js#L7-L8); [extension/right-click-current.js:16–18](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/right-click-current.js#L16-L18); [extension/background.js:1448–1478](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L1448-L1478); [extension/background.js:2008–2047](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/background.js#L2008-L2047).

## Proposed S3-only adapter contract (not implementation)

```ts
type ConnectionRef = {providerKind:string, connectionId:string, scopeGeneration:string};
type Location = {connectionId:string, containerId:string,
  exactPrefix:string, locationId:string, parentId:string|null};
type Page = {locations:Location[], nextCursor:string|null,
  complete:boolean, observedAt:number, scopeGeneration:string};
interface S3Adapter {
  describeCapabilities(ref): Promise<Capabilities>;
  validateConnection(privateHandle, budget): Promise<ScopeReceipt>;
  listContainers(ref, cursor, budget): Promise<ContainerPage>;
  listChildren(ref, location, cursor, budget, signal): Promise<Page>;
  resolveWritable(ref, location, expectedScope): Promise<WritableHandle>;
  saveRemote(handle, sourceHandle, idempotencyKey, signal): Promise<SaveReceipt>;
  verifyReceipt(handle, receipt, budget): Promise<Verification>;
}
```

Capabilities explicitly report list-containers permitted versus fixed allowed bucket set, delimiter listing, cursor semantics, exact-key support, conditional writes, remote-fetch versus byte upload, multipart, HEAD metadata, checksum support and cancellation semantics. Do not assume all S3-compatible vendors implement optional operations or remote URL fetch. A save receipt must bind connection/container/exact key/bytes/provider request identity and verification level. A callback only reports callback completion; provider readback or native authoritative receipt is a separate proof.

Connection setup privately owns endpoint, region, signing version/service, key ID/secret/session token, allowed container scope and refresh semantics. UI/projection receive opaque references, capabilities and safe labels, never credentials. Validate endpoint/scope and provider identity through an authorized setup flow; do not silently treat a network failure as permission revocation or try another connection. An extension-local encrypted setting is not secure merely because it is JSON; choose credential ownership/storage threat model before implementation. No auth flow or service provisioning is authorized by this audit.

Errors must distinguish unavailable/auth-expired/permission-denied/unsupported/invalid-cursor/timeout/canceled/partial/uncertain-write. Cursor is opaque and tied to location, connection and generation. Prefixes are exact S3 key segments with slash boundary; directory markers are optional objects, not native folder IDs. An empty virtual prefix may have no persistent entity. Google Drive/OneDrive native IDs are different semantics and must not be coerced through an S3 prefix adapter.

IF another S3 vendor fails to enumerate, THEN keep other connections' last valid contributions. IF a saved location is stale, THEN preserve its observation but revalidate current scope before save. IF a capability is absent, THEN show a precise unsupported outcome without trying a vendor-specific menu algorithm. ELSE the same Simple/Narrow/Depth projections consume the adapter-normalized identities.

## Fictional adapter acceptance fixture — specification only

Use two fictional connections `r2-a` and `fiction-b`, each with bucket `photos` and prefix `Art/Photography`, plus `fiction-c` on another endpoint with the same bucket name. IDs must include connection identity. Return a virtual prefix, a marker-only prefix, an empty list, paginated list, repeated cursor and a list error on fiction-b. Verify r2-a rows/aliases survive; no target crosses endpoints; two aliases produce separate action IDs; selected parent has Save here; depth bounds/paging are unchanged by vendor. Plugging in fiction-b must require no edits to mode algorithms. This conformance fixture is PROPOSAL ONLY: the executable observations in this audit test real V3 Cloudflare tuples, not a fabricated current generic adapter.

Proposed sibling tree:

```text
REDOWN
  Cloudflare R2 connection A
  Fictional S3 connection B
  Fictional S3 connection C
  Google Drive
  Dropbox
  OneDrive
  Manage destinations…
```

Never nest S3 vendors underneath Cloudflare merely because Cloudflare was implemented first.

## Non-S3 isolation — actual and desired

Google Drive owns its state/folder ID and opens a Google Drive job page for login/save. Dropbox owns PKCE/auth, durable jobs and root upload API. OneDrive owns drive/root/account/connection IDs and its own auth/jobs/API. Sources: [extension/google-drive-provider.js:1–50](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/google-drive-provider.js#L1-L50), [extension/dropbox-provider.js:1–114](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/dropbox-provider.js#L1-L114), [extension/onedrive-provider.js:1–126](https://github.com/thanks-cohn/REDOWN/blob/1f85185f87c52b13e01c7c9069464668c2ad47d0/extension/onedrive-provider.js#L1-L126). These implementations do not use V3 directory records or S3 credentials. Their current menus are fixed provider-specific contributions, not all three menu modes implemented independently.

Actual departures: classic shared background import chain; Dropbox's composer is hosted on Google Drive's menu global and requires a Drive predecessor; OneDrive requires Dropbox predecessor; V3 errors can prevent finish/composition; a structure change can recreate all contributors' destination rows. Provider failures are therefore only partly isolated. The wrapper protects toolbar access, not all provider engine execution.

Proposed neutral registrar protocol is `{providerId,revision,entries:[id,parentId,title,contexts,enabled,type],routes:opaqueOwnedActionMap}`; no credentials, cloud listing or Explorer DOM. Each provider validates its contribution; the registrar retains last acknowledged valid contributions independently, namespaced IDs, parent-first ordering, per-contribution failure status and truthful native acknowledgments. No provider engine imports another engine's internals. Only the registrar merges them. A shared protocol is not permission to make the registrar depend on cloud discovery.

Optional S3 Explorer can consume the same location/index/adapter read contracts and show side-by-side connections. It must not own native menu boot, current save authority or required module initialization. Standalone native saves and Shelf must remain usable if Explorer cannot mount. Sharing an index is useful; sharing UI lifetime as a dependency is not.
