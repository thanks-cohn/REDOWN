> Current follow-up: [Chutey parity and natural drag implementation](CHUTEY_PARITY_IMPLEMENTATION.md). The content below records PR #52; explicit Prepare, narrow drawer and license-drift descriptions are historical and superseded by that report. Live/Windows gates remain open.

# Source audit — P0 phases A/B

REDOWN base: `dae5050bfc3c3ce10a39245ef6464ecd61f4579c` (fetched main).
Chute main checked with `git ls-remote` on 2026-11-04 (Chicago):
`3f9033b261667a2ad90af4a13c45701ae717ab12`, identical to tracked snapshot.
`chute-reference/` is a real directory in this checkout; `/chute-reference` is absent.
No submodule initialization, clone, resnapshot or second service is needed.

| Owner/source | Actual call flow / gap | Integration decision |
|---|---|---|
| `extension/shelf.html`, `shelf.js:route` | Hash router, Remotes/History/Settings; same hidden content sections | Add peer `#explorer`, lazy mount, retain DOM when switching |
| `beta/file-api.mjs:createFileApi` | `run`, batch, capabilities, cancellation, policy, preferences | Sole file authority; use existing operation names |
| `beta/r2-adapter.mjs:createR2Adapter` | accounts/buckets through background; list/preview/readStream authenticated Cloudflare HTTP; exact account/bucket/key | Same adapter as full Explorer; no independent network file paths |
| `beta/explorer.mjs` | Monolithic full view; no reusable mount; globals include busy | New small view, shared API and previews; independent requests |
| `beta/window-preview.mjs` | `renderPreview`, `createWindowPreview`; modal owns controller/URLs | Reuse both, side preview default and double-click modal |
| `explorer-theme.js`, `shelf.css` | Existing palettes, settings and theme tokens | Component scoped styles inherit Shelf tokens |
| `shelf-history.js`, `history-quick-glance.js`, `history-navigation.js` | Separate archive/preview/GO TO owners | Leave unchanged; no drag history/counter writes |
| `entry-bootstrap.js`, `service-worker.js` | Single opener, core recovery | Add isolated drag listener after existing core; no opener changes |
| Google / Dropbox / OneDrive providers | Saving/OAuth supported; no adapters for this Universal File API's list/readStream contract | Remotes action with explicit scope/listing limitation, no fabricated tree |
| Generic S3 | No Universal File API adapter in current full Explorer | Explicit unsupported state; no R2 mislabeling or parallel SDK |
| Chute `extension/explorer-view.js` | Real tree/list/preview, selected rows, keyboard, private drag reference; 32 MiB single-file bound | Adapt component layout/row gestures; preserve attribution |
| Chute `extension/content.js:deliverChuteFile` | `File` -> `DataTransfer.items.add` -> file input input/change or synthetic dragenter/over/drop | Small audited browser interoperability adapter; no URL fallback |
| Chute `direct-drop-google-yandex.js` | Site-specific heuristic input/trigger ranking | Reuse separately, activate only on explicit REDOWN drop; live support unverified |
| Chute `drop-lifecycle.js` | Post-delivery cleanup of overlay drag depth | Adapt cleanup; retain trusted ChatGPT drag lifecycle |
| Chute `background.js` drag registrations | Session references; native original content -> whole base64 read | Replace transport only with bounded extension-private Blob staging/chunks; bytes still Universal API |
| Chute `src/chute/native_host.py`, `server.py`, `explorer/native.py`, `explorer/interop.py` (also older worker-1142026 copy) | Approved extension origins, native control token, local-folder session; no enrolled REDOWN cloud staging/native OLE drag-out API; interop.capabilities explicitly disabled with NATIVE_CONSENT_REQUIRED | Do not bypass enrollment, localhost auth or install a second helper; native drag unsupported |

## Proof boundaries and phase order

Existing file-api, R2 adapter, beta Explorer, Shelf, BOOT and provider tests establish local contracts only. Phase B tests must exercise real `createFileApi(createR2Adapter(...))` listings/readStream and delivery with a real File under controlled browser tests before calling Phase D live acceptance complete. DOM mocks cannot prove trusted external drag. New tests and exact outcomes are linked in TEST_MATRIX_AND_EVIDENCE.md. Phase D/E Windows and site gates remain blocked when unavailable.

The native companion's allowed-origin check cannot be replaced by sending a claimed origin. No nativeMessaging permission is added. Browser reconstruction cannot manufacture trusted OS events. Files exceeding the bounded browser budget must use the existing explicit Download/file-picker alternative, never a silent URL drop.
