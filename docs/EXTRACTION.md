# Focused extraction map

Read-only reference: `thanks-cohn/REDOWN` at `c78babc314acc5891203e95b169f027756e956c1`. This implementation does not transplant the source worker or modify that repository. It reimplements only the mechanisms needed for three-provider saves, using their actual source and focused tests as evidence to inspect.

| Inspected REDOWN source | Source-confirmed mechanism | Basic destination / decision |
| --- | --- | --- |
| `extension/background.js` native `contextMenus.onClicked` dispatch; `google-drive-menu.js`, `dropbox-menu.js`, `onedrive-menu.js` | Native click resolves provider, snapshots resource/page provenance, starts a durable attempt; unrelated menu systems share the original worker. | `extension/background.js`: exactly three direct actions, no copied hierarchy or unrelated worker code. One coordinator handles dispatch. |
| `extension/google-drive-provider.js`, `google-drive-stream.js`, `google-drive-api.mjs` | Drive scope, bounded source reading, HTML rejection, resumable transfer, metadata proof; older and newer clients coexist. | `extension/lib/auth.js`, `lib/source.js`, `providers/index.js`: own manifest identity, one adapter, bounded bytes and readback. Do not retain original fixed extension ID, folder manager, foreground transfer page, or original queue. |
| `extension/dropbox-auth.js`, `dropbox-api.js`, `dropbox-provider.js` | PKCE with state/redirect validation and offline refresh; upload-session finish; metadata identity/size/hash proof; ambiguous finish cannot be blindly replayed. | `extension/lib/auth.js`, `providers/index.js`: independent app key, session/finalization and readback. Retain essential Dropbox content-hash check, not original queues/telemetry/namespace UI. |
| `extension/onedrive-auth.js`, `onedrive-api.js`, `onedrive-provider.js` | Microsoft PKCE, delegated scopes/refresh, verified account; Graph upload session with 320 KiB fragment multiples; bounded materialization for unknown length; preauthenticated upload URL. | `extension/lib/auth.js`, `providers/index.js`: own public client and redirect, bounded known total and correct session fragments. Never forward bearer token to upload-session host or log opaque session URL. |
| `extension/shelf-google-drive.js`, `shelf-dropbox.js`, `shelf-onedrive.js`; Google shelf auth | Stored connected state and navigation are distinct from fresh upload authorization; legacy UI sometimes combines connection/navigation controls. | `extension/shelf.*`: three identical cards, separate OAuth/Refresh/GO TO, explicit readiness and outcome. Do not copy misleading state projections or legacy button behavior. |
| `tests/google-drive.test.mjs`, `tests/dropbox.test.mjs`, `tests/onedrive.test.mjs`, `tests/onedrive-connected.test.mjs` | Mock fixtures assert real byte sequences, no source-URL provider metadata, finalization/readback failures, account changes, interrupted sessions and uncertainty. | Focused Basic tests use new module contracts and adverse cases. Original source tests were inspected, not run as Basic acceptance or imported wholesale. |
| `extension/transfer-counter.js`, original transfer receipts | Delivery identity deduplication matters; old receipt compatibility and generic successful records are broader than Basic's proof gate. | `extension/lib/store.js`, `lib/coordinator.js`: new atomic attempt-confirmation ledger, independent of deletable History. No odometer or legacy success fallbacks. |

## Evidence classification

**Source-confirmed** means the referenced implementation contains a mechanism; it does not prove the provider currently accepts it. **Test-confirmed** means the Basic tests execute a defined behavior using local mocks/fixtures; exact commands and totals are in [ACCEPTANCE.md](ACCEPTANCE.md). **Browser-only** evidence checks Chrome/UI behavior without a real provider. **Live verified** requires an authorized actual native click, cloud upload, and independent saved object/byte/name inspection for that provider.

No provider is live verified by this extraction. Configuring a client ID, obtaining OAuth, opening a website, accepting a queue item, receiving upload start, or passing mocks cannot waive that boundary.

## Exclusions and integrity

Excluded: Cloudflare R2/Workers, explorers, nested destinations, Simple/Narrow/Depth, Chutey/mascots, premium/billing, original odometer, audio/animation systems, global telemetry/forensic/agent registries, old pipelines, original assets, legacy workers and helper services. No original OAuth client identity, keys, tokens, cached account state or secrets are copied. No source filenames imply wholesale reuse.

The root REDOWN license is preserved verbatim in [LICENSE](../LICENSE); [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) records provenance and dependency notices. The requested implementation and PR do not authorize store publication.
