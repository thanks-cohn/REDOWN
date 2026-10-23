# Existing execution boundaries

- MV3 manifest loads background.js as service worker, popup.html/js as launcher and options.html/js as settings/Explorer. Inspect actual HTML script order and manifest permissions.
- Native context menus use saved profiles, Simple/Nested modes and background.buildMenus. Editor removal removes local configuration, not cloud data.
- cloudflare-auth.js owns PKCE login/callback/token storage. cloudflare-api.js owns shared OAuth request timeout/refresh and session lock. Credential expiry comes from provider expires_in; actual refresh issuance is unknown for the client.
- **Primary per-bucket Worker is WORKER_SOURCE embedded in extension/background.js**, deployed by deployCloudflareProfile, R2 binding STORAGE. It handles remote ingest, object reads and transfer/verification operations. Worker 6 includes optional protocol 1 diagnostics; safe Worker 5 remains a supported boundary. Deployed equivalence is unknown.
- **worker/src/index.js is a separate ASSETS sample** with /health and /ingest, configured by wrangler.toml. Sample health does not establish extension readiness.
- Local uploads run in options.js and use OAuth management object PUTs through cloudflare-api.js. The queue contains page-lifetime File references. Absent preflight and PUT are not atomic.
- Preview/download use direct authenticated object API and explicitly guarded public fallback. Cross-bucket copy uses destination Worker → source Worker /object, so OAuth-read success cannot clear Copy404.
- GitHub path installs/dispatches workflow through Contents/Actions; queued is not file committed. Beta hides experimental setup choices, not all historical runtime profiles.
- local/bridge.mjs is optional localhost HTTP forwarding; it is not the current popup's execution route or a shipping native companion. windows/src/main.c is absent despite CMake reference.
- Offline project/debug/semantic/runtime/explorer namespaces are coordinated by agent/diagnostics/registry.json. This corpus is a canonical preservation projection, not another runtime collector or issue owner.

Detailed source/digests: current-state.json. Literal interface inventory: api-census.json. The old Explorer model is retained with stale findings; new refs here were freshly located without changing it. No complete dynamic call graph is claimed.
