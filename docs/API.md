# Internal API v1

The worker implements one validated JS operation dispatcher. The Shelf, own-extension scripts and tests call the same operations; native right-clicks call the same save coordinator. There is no HTTP server, content-script bridge or externally connectable message API.

## Calling and authorization

From Basic's Shelf extension context:

```js
const response = await chrome.runtime.sendMessage({
  api: 1, op: 'providers.checkSaveReadiness', input: {provider: 'dropbox'}
});
if (!response.ok) console.error(response.error.code, response.error.nextAction);
else console.log(response.value); // Never contains an OAuth token.
```

Messages require both Basic's own extension ID and its exact `shelf.html` sender URL. Websites, content scripts, other extensions and unrelated extension pages are rejected. Do not widen the sender allowlist to automate from an unauthenticated page. Tests instantiate the internal dispatcher with injected browser/provider/store dependencies.

Envelope: `{api:1, op:string, input:object}`. Success: `{ok:true,value}`. Failure: `{ok:false,error:{code,message,nextAction}}`. Provider IDs are exactly `google`, `dropbox`, `onedrive`. Unknown operation/version, wrong input type, invalid enum/range or unauthorized sender must fail before effects. `api.describe` supplies the machine-inspectable operation registry; contract tests compare supported names with this document. This name parity check is not exhaustive schema or output conformance; focused tests separately exercise selected inputs, effects and failure cases. API version is separate from extension version `0.1.0`.

## Operations

All operations below are available only to trusted internal callers through that boundary. Destructive local actions show a confirmation in the Shelf; an authorized script's explicit call is itself the request. No operation deletes a provider object.

| Operation | Input | Output / effects |
| --- | --- | --- |
| `api.describe` | `{}` | Version, operation names and inspectable contracts; no remote request. |
| `providers.list` | `{}` | Ordered Google Drive, Dropbox, OneDrive statuses, labels and websites. No interactive consent. |
| `providers.getStatus` | `{provider}` | `{provider,connected,authorized,ready,reason,nextAction}` with current safe authorization projection. |
| `providers.checkSaveReadiness` | `{provider}` | Checks current token/scopes/prerequisites silently; readiness permits attempting upload, not guaranteed success. |
| `providers.goTo` | `{provider}` | Opens that provider's fixed website in a tab. No OAuth or upload effect. |
| `auth.connect` | `{provider}` | Explicit interactive extension sign-in and permission approval; returns safe status. |
| `auth.reconnect` | `{provider}` | Targeted explicit reauthorization for expired/revoked/missing permission; returns safe status. |
| `auth.disconnect` | `{provider}` | Clears only this Basic edition’s local authorization record; does not revoke provider access or clear Chrome’s shared token cache. Returns disconnected status. |
| `auth.refresh` | `{provider}` | Reuses a valid token or silently renews when supported; never blindly opens OAuth. Returns status/recovery reason. |
| `saves.start` | `{provider,sourceUrl,hostUrl?,filename?,requestId?}` | Creates a new durable attempt and runs readiness/source/upload/proof. Returns attempt outcome, not just queued acknowledgement. HTTP(S) sources only. Omit requestId for a distinct new user-requested save; supply a stable requestId to deduplicate one operation. |
| `saves.getAttempt` | `{id}` | Current attempt record or unavailable. No implicit retry. |
| `history.list` | `{page?,pageSize?}` | `{items,total,page,pageSize,pages}` using bounded indexed pages. Page starts at 1. Default page size is persisted preference (40 initially). |
| `history.get` | `{id}` | A local attempt record or unavailable; no cloud fetch. |
| `history.delete` | `{id}` | Removes local record only; ledger/counter/cloud object unchanged. |
| `history.clear` | `{}` | Clears terminal local attempt/History records only; active attempts, counter and cloud objects unchanged. |
| `counter.get` | `{}` | `{count}` cumulative distinct provider-confirmed saves. |
| `settings.get` | `{}` | Persisted settings merged with defaults. |
| `settings.update` | Partial settings object below | Validates and persists supplied fields; cap change safely prunes oldest optional events. |
| `diagnostics.list` | `{page?,pageSize?}` | Bounded event page `{items,total,page,pageSize,pages}`; works with collection off. |
| `diagnostics.getForAttempt` | `{id,page?,pageSize?}` | Bounded retained events for one attempt. |
| `diagnostics.clear` | `{}` | Clears optional local events only; History/counter/cloud unaffected. |
| `diagnostics.exportZip` | `{}` | Generates/downloads a local ZIP of retained events and returns `{filename,downloadId}`; available with collection off. No cloud upload. |

## Settings schema

```json
{
  "theme": "light",
  "pageSize": 40,
  "expansionScope": "none",
  "expansionComponent": "both",
  "diagnosticsEnabled": true,
  "diagnosticsCap": 4000
}
```

`theme`: `light | dark`; `pageSize`: `10 | 20 | 40 | 100`; `expansionScope`: `none | first | all`; `expansionComponent`: `image | urls | both`; `diagnosticsEnabled`: boolean; `diagnosticsCap`: positive whole number or `null` (Unlimited). Zero, negative, fractional or unsafe numeric caps are rejected. Unlimited has no application event-count ceiling; browser quota/device limits remain. Optional collection defaults on with 4,000 **events**, not files/saves. Off preserves retained events and cannot disable core save accounting or error feedback.

`none` collapses both components; `first` applies component defaults only on page 1; `all` applies to the currently loaded page only. Manual toggles are independent per-record/per-component temporary view state, retained through rerenders and page navigation for the current Shelf lifetime and reset only when the Shelf closes/reopens. Defaults persist. No expansion preference fetches unloaded pages or remote full-size images.

## Core records, transitions and exactly-once accounting

Attempt records contain `id`, `provider`, sanitized local `hostUrl`/`sourceUrl` when known, `filename`, `createdAt`, `updatedAt`, `state`, and applicable `code`, `message`, `nextAction`, `bytes`, `durationMs`, `objectId`, `mime`, `preview`, `requestHash` and `diagnosticsWarning`. Unknown provenance stays unavailable. A preview is an optional bounded local data image; its absence is not a broken image.

States: `RECEIVED → AUTH_CHECK → SOURCE_CHECK → UPLOADING → CONFIRMING → SAVED | FAILED | UNCERTAIN`. Only the coordinator can write terminal save proof. A separate metadata readback must match provider object identity/name/size. Google and OneDrive verify a supplied SHA-256 hash or exact streamed bytes; Dropbox verifies its block content hash against uploaded bytes. Provider conflict renames are validated separately against the requested name, and History records the actual final filename. `SAVED` plus the distinct attempt/object ledger updates the counter atomically; duplicate completion cannot increment twice. Deleting History never deletes the ledger. A genuinely new click is a new attempt and may count if independently completed. Optional `requestId` is an 8–100 character string containing only letters, digits, underscore or hyphen. The hash binds provider, source URL, host URL and requested filename. Reusing an ID with different save inputs returns `IDEMPOTENCY_CONFLICT` rather than joining another transfer. Concurrent calls with one ID and identical inputs join the same operation; persisted records are returned without reupload. Reusing a successfully completed ID after its History record is deleted returns `ALREADY_COMPLETED`, because the independent ledger still owns that ID. Use a new ID only for a deliberately new save.

Worker restart does not replay uncertain uploads. Incomplete attempts become `UNCERTAIN` and never green. A failure before a save is confirmed stays a failure; an interrupted/ambiguous mutation stays uncertain. Check the destination before making a new attempt. There is deliberately no unsafe generic retry/resume operation.

## Diagnostics and ZIP

Events contain timestamp, attempt ID, provider, stage, outcome (`Success | Failure | Uncertain`), basic code/cause and sanitized known URLs. Bytes and elapsed duration support `speedBps` only when measured; unavailable speed is N/A. Speed describes bytes divided by elapsed time across upload and provider metadata confirmation, excluding source acquisition; it is not a claim about ISP bandwidth. No per-byte telemetry, tokens, cookies, headers, contents or provider response bodies are retained. Optional storage failure cannot invalidate an otherwise confirmed save: a best-effort `diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE"` is retained on History/terminal feedback; optional events may be absent.

`diagnostics.exportZip` packages retained data as `events.jsonl`, `summary.json` and `README.txt`, with version, count, retention mode, timestamp and privacy note. Export uses chunked event reads and a small established ZIP implementation. The current implementation bounds ZIP output to **16 MiB** and reports `EXPORT_TOO_LARGE` rather than exhausting memory; retained records are unchanged. Local browser storage/download/quota failures remain possible. Collection being off does not prevent export.

URLs have sensitive credential fields redacted locally, but private paths or unrecognized query parameters may remain. The Shelf warns before export. User-provided error strings or remote response text must never become an unfiltered diagnostic body. No analytics/server receives these events.

## Errors and recovery

Errors use short safe codes and a next action rather than leaking raw credentials or remote response bodies. Core codes include `CALLER_DENIED`, `API_VERSION_UNSUPPORTED`, `UNKNOWN_OPERATION`, `INVALID_INPUT`, `INVALID_PROVIDER`, `INVALID_SETTINGS`, `INVALID_PAGE`, `INVALID_REQUEST_ID`, `IDEMPOTENCY_CONFLICT`, `ALREADY_COMPLETED`, `ATTEMPT_NOT_FOUND`, `ATTEMPT_ACTIVE`, `CONFIRMATION_REQUIRED`, `CONFIRMATION_MISMATCH`, `WORKER_INTERRUPTED`, `SOURCE_URL_UNSUPPORTED`, `SOURCE_HTTP_ERROR`, `SOURCE_PARTIAL_REJECTED`, `SOURCE_HTML_REJECTED`, `SOURCE_TOO_LARGE`, `SOURCE_EMPTY`, `SOURCE_LENGTH_MISMATCH`, `SOURCE_TIMEOUT`, `SOURCE_UNAVAILABLE` and `EXPORT_TOO_LARGE`. Common provider classes include OAuth not configured, missing scopes, authentication cancelled/revoked/expired, source access/HTML/empty/size failures, provider rejection/rate limit, confirmation mismatch, interrupted work and export/quota failure. The actual code is returned by the dispatcher and retained on applicable attempts/events.

- Not connected/missing permission: configure the correct independent client/redirect, then Sign In or Reconnect/Approve. GO TO cannot repair OAuth.
- Microsoft `AADSTS9002326`/`AADSTS9002327`: confirm the registration’s platform/public-client configuration and exact redirect against the extension’s token-request Origin/CORS behavior. Live SPA/public-client acceptance remains unverified. Do not embed a secret or disable security to make token exchange pass.
- Valid token: Refresh/readiness performs no interactive popup. Revocation can still be discovered by a provider request after a cached readiness check.
- Source HTML or access restriction: choose the actual accessible file URL; a website page/cookie session is not evidence of fetch access.
- Provider limit/temporary denial: inspect the stated HTTP category and retry explicitly only after establishing no uncertain object was created.
- Uncertain commit/readback/restart: independently inspect the provider before making a new save. Never convert a local pending receipt into success.
- Storage/export failure: free local quota or retain a smaller diagnostics cap; no counter/History reset is a recovery strategy.

Examples of read-only inspection:

```js
await chrome.runtime.sendMessage({api:1,op:'counter.get',input:{}});
await chrome.runtime.sendMessage({api:1,op:'history.list',input:{page:1,pageSize:40}});
await chrome.runtime.sendMessage({api:1,op:'diagnostics.getForAttempt',input:{id:'attempt-id',page:1}});
```

## Portable registration boundary

Statuses may include `setupRequired:true`: registration, runtime extension ID, callback or Google manifest mismatch blocks Sign In before OAuth. `EXTENSION_ID_MISMATCH`, `OAUTH_MANIFEST_MISMATCH`, `OAUTH_REDIRECT_MISMATCH`, `IDENTITY_CONFIG_INVALID` explain setup; `AUTH_PROFILE_CHANGED` requires explicit sign-in for an old/unbound credential. `auth.disconnect` clears Basic’s local record only and cancels stale in-flight updates, without provider revocation or shared Chrome cache deletion. Internal auth also exposes getStatus/checkReadiness aliases. See [profiles](PORTABLE_DEPLOYMENT_PROFILES.md).
