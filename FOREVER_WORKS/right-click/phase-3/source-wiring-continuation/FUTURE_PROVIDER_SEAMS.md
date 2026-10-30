# Future provider seams — read-only map, no new API

[Navigation](README.md) · [prior provider constraints](../../PROVIDER_NEUTRAL_FUTURE_CONSTRAINTS.md) · [browser-byte requirements](../../BROWSER_TO_CLOUD_FUTURE_REQUIREMENTS.md).

CURRENT FACT at `b7178442c26c7723a9a650613ef65ba38ce26b21`: native right-click `menuEntries` selects cloudflare-r2 profiles, `validate/resolve` require prepared same-account R2 buckets, and click invokes R2 Worker ingestion. These are not already provider-neutral interfaces. R2 IDs/profile identity/menu fields remain unchanged until an explicitly reviewed migration. No account connection, remote provider read/write, adapter, permission or transport is added here.

| Seam / actual source | Reusable responsibility | R2 assumption / future gap |
|---|---|---|
| destinations.js / nested-menu-editor.js | Task grouping, labels independent of target, draft/Save/expected, folder outline, inclusion/removal | Account/bucket profile schema and cf* messages explicitly R2; future view cannot turn Drive folderId into a prefix by relabeling |
| nested-locations.js | Pure hierarchy/ancestry/IDs/order/context plan principles | menuEntries type filter; bucketName/prefix destinations; not a generic provider registry |
| destination-config.js | Projection/validation/fresh resolver discipline | Fields and prepared target lookup R2-specific; no other provider identity/storage schema |
| background onClicked / selectedUrl | Source selection, fresh target before dispatch, honest outcome boundary | Hardwired ingestCloudflareAtPrefix; sourceUrl is a reference, not acquired browser bytes |
| background preparedProfile/callBucketWorker/WORKER_SOURCE | Existing independent Worker remote ingestion/auth/exact-path checks | Can deploy/repair; STORAGE binding (not worker/src ASSETS sample); no browser cookies/Blob ownership |
| beta/r2-adapter.mjs upload/verifyUpload and file-api.mjs | Existing local File-byte upload, bounded orchestration/conflict/receipt ideas | Direct R2 staging+read-back+safe final transfer, current300000000-byte gate; not native click transport or generic provider guarantee |
| hitomi-capture.js + background capture/session handling | Existing bounded permitted site-specific browser-byte bridge | Specific intent/tab/session/origin/size checks;64MiB, in-memory chunks; not universal extraction/resume API |
| google-drive-auth.js getToken/about/verify | Source-present Chrome Identity auth concept | Required DOM/loader absent; manifest no oauth2/client/scopes/Google hosts; no folder/upload route. Auth source isn't working menu upload |
| provider-opening.js RedownProviderOpening.open | Verified provider URL tab/window/split opening + preferences | No account authorization/listing/upload; Dropbox/OneDrive allowlists aren't adapters |
| recordTransfer/history/counter | Completion evidence stays distinct from starting/auth/URL opening | Receipt shape includes R2 locator; future provider receipt needs reviewed mapping and privacy policy |

**PROPOSED future flow:** connected account → authorized folder picker → saved menu entry → native click → permitted source bytes through browser/extension → provider upload → exact provider receipt/history. No provider-specific file Explorer is a prerequisite. Keep optional R2 server remote fetch as an independent capability; do not force it to stand in for browser-mediated bytes.

| Provider | Future stable identity and permission proof needed | Transport/receipt obligation (not implemented) |
|---|---|---|
| R2 | Existing accountId/bucket/prefix/profile and worker secret; preserve current native IDs | Existing eligible public HTTPS remote ingestion separately; browser upload path has different limits/verification |
| Google Drive | Account subject + authorized folderId; app scope/Picker/shared-drive context reviewed | Actual bytes via approved upload/session, returned fileId/parents/size; drive.file is not assumed whole-Drive recursion |
| Dropbox | Account + namespace/root + authorized folderId/path; app-folder/full-account scope reviewed | Upload/session/conflict/revision/path metadata; endpoint numeric guarantees remain unverified from prior landing-page retrieval |
| OneDrive | Tenant/account + driveId + parent itemId, personal/business/SharePoint permissions | Graph byte upload/session/expiry/expected ranges and DriveItem receipt; sensitive session URLs must not enter logs |

## Browser bytes and authorization constraints

srcUrl/linkUrl/pageUrl cannot guarantee readable bytes. activeTab grants temporary tab-origin authority, not arbitrary CDN hosts; current manifest lists Cloudflare/GitHub/Worker/R2/Hitomi/localhost, not general media or new cloud hosts. Browser-authenticated bytes, expiring URLs, blob:/data:, restricted pages, content-script CORS and redirects need explicit permitted acquisition or a clear unsupported outcome. Never forward user cookies to a Worker/provider or promise DRM/private-file extraction.

Chrome messaging JSON does not preserve File/Blob identity automatically. A later design must choose reviewed bounded chunks/document ownership/offscreen requirements, memory/backpressure, sender/tab/frame/intent checks, cancellation, upload-session checkpoint/reconciliation and MV3 suspension handling. Current queues/chunks do not give universal durable transfer or unlimited lifetime. Retrying a read differs from replaying an ambiguous provider write; reconcile uncertain writes and conflicts first.

Future capability discovery, picker, destination identity, source acquisition, transport selection, upload and receipt mapping are **candidate boundaries only**. Adding them requires a separate provider/data/permission design; this audit implements none. Reuse existing UI/wiring principles without silently broadening current R2 save schema or manifest permissions. Prior primary-reference captures are linked in Phase2; no provider numeric assertion here is promoted to fresh live verification.
