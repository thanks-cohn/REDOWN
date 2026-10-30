# Future provider seams, read-only mapping

30 October 2026. **AUDIT ONLY.** Source `b7178442c26c7723a9a650613ef65ba38ce26b21`. All implementation facts below are pinned source inspection unless a named local fixture is cited. No installed Chrome or live-provider verification. Proposed boundaries are documentation, not existing APIs or accepted Forever intent.

No provider, permission, authentication, transport router or API was implemented. This section maps current source boundaries; external protocol assertions below are future constraints rather than newly verified endpoint specifications. Prior primary-reference retrievals remain in [Phase 2](../PROVIDER_NEUTRAL_FUTURE_CONSTRAINTS.md).

| Layer | Reusable principle/source | R2 coupling that prevents claiming generic API |
|---|---|---|
| UI and menu shape | stable IDs, title independent of target, tabs/outline/removal/order, pure parent-first planning | current menuEntries filters cloudflare-r2; stored root bucket/name path isn't an opaque provider folder ID |
| Account selection | connected account → authorized folder picker need not be an Explorer | cfAccounts/cfBuckets/cfFolderChildren/cfDestinationFolders are Cloudflare-specific; OAuth scopes/account identity differ |
| Save/resolve | single authoritative commit, optimistic signature, stale ID rejection, no resurrection | C.project/validate/resolve and background allowed patch target known R2 profiles/workerUrl/token |
| Source | selectedUrl context priority, explicit source intent | ordinary native path forwards URL to R2 Worker, does not acquire generic permitted browser bytes |
| Byte path example | existing site-scoped gallery capture and local File upload show bounded bridges | Hitomi origin/session/size constraints and r2-adapter staging are not generic provider transports |
| Delivery | exact target + provider receipt/history, avoid counting upload start | preparedProfile/deployCloudflareProfile/ingestCloudflareAtPrefix/embedded STORAGE Worker are R2-specific |

Future owner flow: connected account → authorized folder picker → saved entry → Chrome click → provider delivery, without requiring Drive/Dropbox/OneDrive file Explorers. Proposed destination identity must include provider + stable account/container/folder identifiers; names and displayed paths are not permission. Preserve existing R2 IDs/records unchanged via a separately reviewed compatibility adapter, not a blind schema rename.

Actual permitted bytes must be acquired in the browser/extension when required and delivered to provider upload endpoints. Keep optional R2 server remote ingestion independent. Host permissions, readable response/CORS, cookies/origin, restricted pages, JSON messaging, MV3 lifetime, memory/backpressure, chunk/session restart state, scopes/revocation, conflicts, uncertain writes and receipts require explicit tests. A URL or blob: reference is not bytes and connection alone does not grant website access.

Current google-drive-auth.js is dormant source with missing loader/controls/manifest OAuth configuration, not a functioning right-click upload. provider-opening.js launch preferences and Dropbox/OneDrive names are not upload adapters. No Google/Dropbox/Graph account login or provider read/write occurred here. Later provider implementation must retrieve current official documentation and test authorization, picker identity, chunks/session expiry and completion independently.
