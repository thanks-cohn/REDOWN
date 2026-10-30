# First Cloudflare slice

Implemented local chain:

1. Existing Connect Cloudflare / Activate Buckets authorizes and prepares storage. V3 snapshot exposes only prepared account/bucket metadata.
2. V3 Setup adds a bucket root or exact nested prefix; Browse uses existing paged `cfDestinationFolders` reads. Adding a menu entry does not provision, create folders or publish URLs.
3. Save validates and persists the independent canonical store. Settings → New Right-click → Apply installs its parent-first Chrome plan.
4. A supported media/link/page context selects the existing `selectedUrl` priority, resolves the exact V3 target, and calls existing `ingestCloudflareAtPrefix` with provisioning disabled. V3 accepts HTTPS sources; the existing transfer transport and its lifetime behavior are retained.
5. The existing Worker chooses Keep Both and returns its existing key/bytes/URL receipt. V3 additionally calls read-only `headObject` without repair and requires matching key, byte count, ETag presence and source metadata before recording `ok:true` and notifying completion. Mismatch/failure records failure with available destination receipt; a file may already exist. No automatic ambiguous-write replay.
6. Existing History consumes the transfer record and its exact destination. Existing Explorer can list/open that destination. No Explorer rewrite or live auto-refresh guarantee is claimed.

Tests execute the actual background transaction, registration builder, listener and ingest function with synthetic profiles/Chrome/provider responses. They are not installed-Chrome or live R2 tests. No live credentials or disposable target were configured for this environment. Managed Chromium blocks unpacked installation; policy was inspected, not bypassed.

Outstanding P0 acceptance: actual installed click → authorized source → exact disposable R2 bytes → History → Explorer, true MV3 restart/multi-window races and native rendered hierarchy. Gallery capture retains its existing shared route; its V3 remote-byte/read-back behavior has not been newly certified. No cloud mutation or customer deployment occurred.
