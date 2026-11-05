# Authority and lifecycle

Provider -> existing Universal File API -> Shelf rail/list/preview.
Explicit Prepare -> Universal File API readStream -> bounded private staged Blob ->
opaque expiring drag reference -> content adapter -> Chute File/DataTransfer delivery.

| Concern | Sole owner |
|---|---|
| Auth, cloud identities, exact keys, listing, metadata, byte reads, mutations | REDOWN Universal File API and existing adapter |
| Navigation, bounded rendering, selection, preview ownership | Shelf Mini Explorer |
| File reconstruction, input/drop dispatch, destination heuristics | Chute-derived interoperability adapter v1 |
| Verified saves, History and successful counters | Existing REDOWN transfer flows; never drag |
| Target acceptance / upload completion | Destination; dispatch alone proves neither |

Preparation is explicit because asynchronous authenticated reads cannot complete inside synchronous dragstart. A drag before preparation is cancelled with instructions. No card rendering reads bytes. Only one prepared file is retained; replacing/cancelling it deletes staging. Blob size is bounded (32 MiB normal / 8 MiB low-memory), checked during every chunk and against listing size; no base64. Expiry is one minute; IndexedDB survives service-worker suspension, and alarm/startup purge removes stale records. Claim binds a one-use reference to the actual trusted drop's tab/frame; chunks cannot migrate between receivers. No provider credential, key, URL or temp path enters DataTransfer. Target receipts are classifications only, never upload-success claims.

Rail and content request ownership are separate. Navigation aborts its predecessor, generation checks discard late responses. Cache is bounded, short lived and invalidated by explicit refresh/mutations/auth changes. Preview controllers/URLs are disposed on navigation and leaving Explorer. Scroll/path/selection remain in mounted DOM across tab switches; canonical last path and bounded expansions persist locally, revalidated against discovered account/bucket access after reload. No saved credentials or file bytes in view preferences.

Native handoff is intentionally unavailable: current Chute native protocol serves enrolled local Explorer sessions, with no authorized REDOWN cloud-staging/OLE drag operation. Existing Download and target file picker are the explicit fallback. Large transfers/multi-file native staging require an upstream reviewed protocol, not localhost assumptions.
