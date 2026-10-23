# Existing API census

api-census.json contains 128 literal message/action/route/storage-call observations plus the existing 24 Explorer operation contracts. Every observed location has baseline revision, SHA-256 and symbol/line. This is a lexical inventory, not a complete parser: dynamic paths, caller identity, arguments, idempotency and side effects require the linked source review. Missing details stay unknown rather than invented API guarantees.

| Boundary | Actual mechanism | Important distinction |
|---|---|---|
| Cloudflare auth | dash.cloudflare.com/oauth2/auth and /oauth2/token, PKCE/state, shared lock | Successful grant does not guarantee refresh-token issuance |
| Management | api.cloudflare.com/client/v4 through cloudflare-api.request | Permission 403 differs from token rejection; exact per-segment object keys |
| Worker | Embedded source POST action dispatcher, /object, /private/object, /private/archive-entry, /assets/ | Worker protocol and R2 binding are separate from OAuth object reads |
| Sample | worker/src/index.js GET /health, POST /ingest | ASSETS rather than STORAGE |
| Helper | 127.0.0.1, LOCAL_PORT or 8765, POST /ingest | Origin-prefix check, not extension-ID pairing; credentials remain helper-side |
| GitHub | Contents workflow installation, Actions workflow dispatch | Queue acknowledgement, not completed delivery |
| Native Chrome | Manifest permissions plus action icon API | UI/API mock success is not installed permission/clipboard/download acceptance |
| Offline inspection | agent/diagnostics/cli.mjs qualified namespaces | No cloud connection or mutation authority |

Use docs/agent/MESSAGE_INVENTORY.md and agent/explorer/model.json as historical/current navigators, then verify source anchors. Do not invoke cfPrepareBucket/Repair for an apparent read. cfPublicAddresses is discovery; cfEnablePublicAccess is a distinct confirmed mutation. Explicit read-only probes still require their actual caller/scope rules and are not executed by offline CLI.
