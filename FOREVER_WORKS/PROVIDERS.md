# Current dependencies and replacement limits

The canonical dependency list covers Chrome extension APIs, Cloudflare OAuth/management, R2 Worker binding, GitHub Contents/Actions, Node inspection/helper runtime, JSDOM tests, Wrangler and bundled model-viewer. classifications are explicitly inferred/unreviewed evaluation inputs; original selection rationale is unknown unless a source establishes it. Required capabilities, invariants and compatibility prevent a candidate from passing merely by satisfying a technology name.

No new provider or competitor API is ingested as working software. Multi-cloud, Google Drive/GCS, OneDrive, Dropbox, MEGA/S4 and rclone remain background leads, not current production adapters. The current ingestion does not depend on those proposals.

For any future replacement, inspect official current API docs and verify auth/scopes/renewal, exact-key behavior, conditional writes, pagination, retry/idempotency, data format, execution location, customer cost and UX. None of those external guarantees is certified by this snapshot. A bucket is storage, not an executable transfer service. Google Drive is not GCS. Source-observed size limits are application assumptions until independently validated against the actual provider.

Cloudflare account OAuth, Worker Bearer secret, private signed read and GitHub token are distinct boundaries. Never export credentials. Worker binding declarations are not independently read provider truth. The helper's extension-origin prefix does not establish a particular paired extension identity.
