# Browser-to-cloud future transport requirements

[Route](README.md) · [provider constraints](PROVIDER_NEUTRAL_FUTURE_CONSTRAINTS.md) · [existing runtime](CHROME_RUNTIME_AND_SECURITY.md)

**PROPOSED first-class future transport; no implementation authorized.** Current context-menu srcUrl/linkUrl/pageUrl are references, not transferable bytes. A cloud account connection never grants arbitrary website/media access.

## Actual current transfer paths

| Source/path | Present implementation | Exact limits/gaps |
|---|---|---|
| Ordinary native page/link/media | selectedUrl→resolve→ingestCloudflareAtPrefix→Worker checkedFetch | Worker fetches bytes remotely, public HTTPS/private-host/redirect checks; cannot inherit user's browser cookies/blob URLs or all site access. Known-length streaming/unknown-length bounded buffering; default314572800 bytes. |
| Local user File | beta/r2-adapter upload | Document owns File body, direct authenticated PUT to temporary R2 key, metadata/size + byte read-back then Worker safe final commit.300000000-byte gate differs from Worker limit; no generic multi-cloud adapter. |
| Hitomi gallery Blob | explicit native selection→armed tab intent→MAIN-world createObjectURL interception→ISOLATED capture→base64 chunks→background Blob→R2 | Site-specific existing browser-mediated exception, not generic extraction.64MiB limit,256KiB decoded chunk, session ID/expected size, original sender tab and hitomi.la URL checks; persistent queue but chunks/intents in memory. |

The gallery flow ([background.js:2262 async function handleHitomiCaptureMessage](../../extension/background.js#L2262), hitomi-capture.js) demonstrates one possible bounded byte bridge. window.postMessage input originates from the page and is untrusted; active intent, allowed sender/session/size are essential, not a universal secure arbitrary blob tunnel. Queue status can retry capture but does not preserve partially buffered chunks across service-worker termination. Captured page URL changes/restart can require original tab; ambiguous remote completion can duplicate without independent reconciliation. Do not generalize its scope/security or call it universal resumability.

## Sources and fail-safe requirements

| Future source | Acquisition prerequisite | Failure/transport requirement |
|---|---|---|
| Public HTTPS file link | permitted extension fetch host OR explicit approved remote-ingest service | Validate redirects/type/size/name and actual access; source reference alone is not done |
| Selected image/video/audio | actual srcUrl, possibly cross-origin/signed/expired | Temporary page access is not automatic CDN permission; dynamic media/DRM/stream manifests may not be downloadable bytes |
| Browser-authenticated resource | appropriate origin/cookie context, user authorization, actual response readability | Do not copy cookies/secrets to Worker/provider; fail if bytes unavailable; no promise CORS/login can be bypassed |
| User-chosen File/Blob/drop | explicit user action and live document ownership | Chunk/stream in permitted context, cancellation/backpressure/budget, no promise File survives page closure |
| blob:/data: or generated object | owning page/document and permitted extraction | Blob URL is document-scoped reference; Worker cannot remote-fetch it. Page signals remain untrusted |
| Restricted Chrome/store/internal page | browser security constraints | Unsupported source; no policy bypass or forced extension installation |

## Chrome and security boundaries

[Cross-origin requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) primary doc was retrieved. Extension-origin host access needs matching permissions; content-script requests retain page-origin/CORS constraints. activeTab is temporary user-gesture authority for the tab origin, not unlimited access to arbitrary linked hosts/private files. Current manifest's Cloudflare/GitHub/Worker/R2/Hitomi/localhost hosts do not grant arbitrary CDN/Google/Dropbox/Graph access. Future optional host permissions/consent must be scoped separately; no permissions widened here.

Chrome extension messaging uses JSON serialization; a raw File/Blob cannot be assumed to cross runtime messages intact. A later design must choose bounded encoded chunks or a permitted long-lived document/offscreen context with reviewed lifetime and permission needs; these are candidate architectures, not implemented channels. Validate sender/tab/frame/origin, source intent/epoch, byte counts/limits, and never log token/session URLs or customer contents.

[Service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) retrieved primary reference describes30s inactivity, individual requests generally5min and fetch-response30s termination conditions, with version-specific exceptions. Events/APIs can reset timers; none grants unlimited background transfer. Separate persistent job metadata from live bytes, provider upload-session checkpoint, restart reconciliation and outcome. Do not retain actual credentials or unbounded content in diagnostic records.

## Required transport/receipt semantics before build

- Select browser acquisition or optional server remote ingestion explicitly based on source accessibility/provider capabilities, not a UI label or assumption that all cloud providers fetch URLs.
- Bounded chunking/backpressure, memory budget, size validation, progress and cancellation must distinguish “stop waiting” from “remote write stopped.”
- Persist only reviewed restart/session metadata; encrypt/protect sensitive provider session URLs and avoid exporting them. Expired sessions, changed accounts and revoked grants need explicit recovery.
- Retry safe reads within bounds; reconcile uncertain writes first. Provider conflicts/conditional writes and exact account/folder identity must survive reorder/rename/removal.
- A provider acknowledgment/file ID/size is distinct from independent integrity proof and source/provenance. History and counter update only on defined qualifying completion; start/auth/URL opening cannot count as delivery.
- Test permitted media acquisition, denied host/CORS, auth expiry, changed tab, chunk loss/duplicate/order, exceeded memory/size, suspend/restart, partial upload, expired sessions, cancellation-after-dispatch, conflicts and exact target/receipt.

No new source-byte acquisition, generic transfer coordinator, provider adapter, offscreen document, upload session or API was built. Current R2 engine and layout remain unchanged.

Additional primary reference: [Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging), retrieved HTTP200; JSON serialization means File/Blob identity cannot be assumed to survive a runtime message. Dropbox OAuth reference was also retrieved, but substantive endpoint upload guidance remains an explicit gap.
