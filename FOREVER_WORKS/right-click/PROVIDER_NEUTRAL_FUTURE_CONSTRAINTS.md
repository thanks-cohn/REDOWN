# Provider-neutral future constraints — documentation only

[Route](README.md) · [browser-to-cloud](BROWSER_TO_CLOUD_FUTURE_REQUIREMENTS.md) · [primary fetch ledger](evidence/phase-2/official-fetches.json)

**PROPOSED requirements, not an implementation.** Preserve R2 user behavior, IDs, prefix semantics, explicit authorizations and styles. No provider adapters, OAuth config, permissions or messages were added.

## Actual present implementation versus names in UI/docs

| Surface | Current source | Proven state and missing work |
|---|---|---|
| R2 native right-click | background + nested-locations + destination-config | Working local exact-target fixtures; native Worker remote-fetch path, not browser-byte fetch; live unknown |
| R2 browser local upload | beta/r2-adapter upload/verifyUpload | Actual File-body PUT staging, size check/byte-for-byte staging read-back, conditional final move receipt;300000000-byte application gate; not independent final SHA256 |
| Google Drive auth | [google-drive-auth.js:5 const SCOPE=](../../extension/google-drive-auth.js#L5) + getToken/about/verify/login/restore | Source-present dormant module. Full extension search finds no HTML loader or consumer of RedownGoogleDriveIdentity; required google-state/google-connect elements absent. Manifest has no oauth2 client/scopes and no Google API host entries. If module were mounted it would show setup or return early; no current connection/upload claim. |
| Google OAuth guide | docs/GOOGLE_DRIVE_OAUTH_SETUP.md | Describes auth behavior and explicitly says upload/folder integration not implemented; “implemented” wording is a historical source statement, not current mounted/runtime proof |
| Provider URL opening | provider-opening.js | Loaded utility exposes RedownProviderOpening.open with host allowlists and tab/window/split fallback; no data-provider-open controls/callers found beyond definition at pin. Preferences/launcher scaffolding, no OAuth/upload/folder discovery. |
| Dropbox/OneDrive | Repo search of extension JS/MJS/HTML | No actual upload adapter found. Named launch options/allowlists cannot establish account connection or delivery. Future catalog only. |

## Identity, scope and upload differences

| Provider | Saved destination identity candidate (PROPOSED) | Auth/folder selection | Byte upload/session/receipt constraints |
|---|---|---|---|
| R2 | provider + account + bucket + exact key prefix; current IDs unchanged | Cloudflare account OAuth for management; private Worker secret separate; bucket readiness explicit | Current Worker can fetch eligible remote HTTPS; current document can upload File via R2 REST staging. Do not treat R2 bucket as executable fetcher or current native receipt as full byte-integrity proof. |
| Drive | account subject + folderId; fileId receipt; shared-drive context when relevant | drive.file is per-file created/opened/shared-with-app authorization; Google Picker or authorized picker needs proof for selected folder and subsequent children; account name/path string is not authority | Simple/multipart/resumable choices; documented chunks multiple256KB except final, session URI expires after one week. Server-generated file ID/parents metadata distinguish target. Scope/folder grants are not recursive all-Drive permission by assumption. |
| Dropbox | account + namespace/root + authorized path or folder ID | OAuth app scope/app-folder versus full-Dropbox choice must be reviewed; folder selection not equivalent to global write scope | Upload sessions, metadata/ID/path, revisions, conflict modes and retry behavior must be verified against endpoint reference before design. The fetched guide URL returned a developer landing/navigation page, so no numeric Dropbox limit/session guarantee is asserted as verified here. |
| OneDrive | tenant/account + driveId + parent itemId; target item receipt | Personal account vs work/school/SharePoint drive/site, delegated permissions and folder accessibility differ | Graph upload session preauthenticated URL is sensitive; expiry and next expected ranges matter. Primary doc requires sequential fragments, each request<60MiB, chunk sizes multiple320KiB; final success returns DriveItem. PUT upload URL does not use the initial POST bearer header. Conflict rename/replace/fail and eTag preconditions need explicit policy. |

Primary retrieved references: [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Graph upload session](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0). [Dropbox file-access guide](https://developers.dropbox.com/dbx-file-access-guide) fetched200 but substantive upload endpoint content was unavailable in returned landing HTML; [HTTP API reference](https://www.dropbox.com/developers/documentation/http/documentation) requires follow-up. Retrieved hashes/short excerpts are preserved; external docs are not product test evidence. Provider numbers are reference observations as fetched, not promises of universal resumability/quota.

## No provider Explorer prerequisite

Future flow must be connected account→authorized folder picker→saved destination→Simple/Nested native plan→provider delivery. This is **OWNER_INTENT from Phase2 request**, not current feature. The picker can be independent of a provider file Explorer. Current bucket-specific selector and profile-only validator cannot represent Drive/Dropbox/Graph by merely changing a label.

## Candidate separation points, all PROPOSED

1. Account authorization and capability discovery: provider-specific scopes/session/consent, no credential reuse across clouds.
2. Folder listing/authorized selection: stable identity independent from displayed path and no Explorer prerequisite.
3. Canonical destination reference: stable provider/account/container/folder ID, label and menu hierarchy separately; retain existing R2 records/IDs with private adapter.
4. Plan/resolution: reuse ordering/parent-first and stale-ID principles. Current menuEntries/resolve explicitly filter cloudflare-r2 and prepared buckets, so they are **not already generic provider APIs**.
5. Source acquisition and transport: browser permitted bytes versus optional provider/server remote fetch, never assumed interchangeable.
6. Provider upload and exact receipt/history: provider version/size/checksum evidence, conflict/uncertain state, redacted logs; no success count for mere authorization or upload start.
7. Independent UI presentation: minimal intuitive setup, bucket default naming, retained folder outline/red ×; no simultaneous redesign/migration forced by adapter addition.

Genuinely reusable ideas: stable IDs, labels separate from target, deterministic ordering, parent-first tree logic, draft conflict discipline, least-privilege mutations and outcome truth separation. R2-specific code: account/bucket/prefix validation, Worker provisioning and bearer, preparedProfile, cf* messages, R2 REST upload/receipts. file-api run/batch has generic orchestration ideas but location/key/name and adapter contracts contain R2 assumptions; source naming alone is not provider neutrality.

Permission consent, token handling, native integration, browser acquisition and provider conformance must be reviewed/tested independently before implementation. No OAuth login or upload was performed for this audit.

R2 primary reference was recovered through the read-only Cloudflare documentation connector after direct HTTP403: [Workers API reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [retrieval record](evidence/phase-2/official-r2-retrieval.json). It documents put/head/get and conditional onlyIf behavior; this does not independently verify the deployed binding or native receipt.
