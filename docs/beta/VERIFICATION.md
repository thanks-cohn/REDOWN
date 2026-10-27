# Beta Explorer verification, 27 October 2026

Base: `ec6d5cfc964e1fe2b3d73403a5cf8d5dc0555059`. Branch: `beta-explorer`. No merge to main, cloud mutation, Worker deployment or store publishing was performed.

| Check | Actual result |
| --- | --- |
| New Beta tests | **17 passed, 0 failed** |
| Focused production regression | **64 passed, 0 failed** |
| Full regression in reliability runner | **392 total: 382 passed, 10 failed**, none skipped |
| Standalone `npm run check` | All syntax targets passed |
| API registry and issue inventory | Passed |
| Architecture freshness | Failed, pre-existing stale references |
| Final reliability runner | Failed: architecture freshness and existing regression debt; its syntax subprocess also hit its 60-second timeout under host contention. Standalone syntax rerun passed afterward. |
| Package audit | ZIP integrity passed; all 41 allowlisted runtime files included, including five Beta assets. Release remains blocked by existing root/bundled license drift and live acceptance gates. |
| Installed Chrome / screenshots | Not verified. No Chrome binary was present; browser download failed with an invalid/truncated archive. No administrator policy was bypassed. |
| Live Cloudflare / 200 MiB corpus | Not run. No owner-approved disposable cloud namespace or installed session was available. |

The first regression run, before API implementation, was 365 passed / 10 failed. All ten failure names from the final regression were present in that initial run. The release runner's older baseline categorizes seven as known and three as new; those same three were already present before the new API. No historical hashes, assertions or baseline labels were refreshed to hide them. Existing production `background.js`, `options.html`, `options.js`, `cloudflare-api.js`, `cloudflare-auth.js` and context-menu transfer code remain byte-for-byte unchanged from the requested base.

The 64 production checks ran these files: `beta-popup`, `cloudflare-files`, `explorer-copy`, `explorer-worker`, `popup-destinations` and `popup-folders`, under `tests/`, all with `.test.mjs` extensions. They protect existing popup, authenticated file access, transfer composition, embedded Worker and right-click destination contracts. They are local tests, not new proof of the owner's installed right-click behavior.

New tests execute the actual production background operation functions and embedded Worker against in-memory R2. They check file/folder browsing and mutations; Unicode and nested paths; zero-byte and 50 MiB binary uploads; content type; skip/keep/replace conflicts; folder copy/rename/delete; same-folder duplication; corrupt read-back refusal; retained staging and uncertainty; cancellation of remaining batch work; lost-message no-replay behavior; and final byte identity using independent SHA-256 calculations. The adapter passes the original File body directly; verification uses two streams rather than buffering the whole file in client code. No browser RSS benchmark is claimed.

JSDOM executes the actual Beta interface source with the tested adapter and a simulated Chrome/HTML-dialog surface. It exercises navigation, multiselect, copy/paste, rename, cancel-delete, new folders, filter/grid, keyboard/context-menu dispatch and folder drag/drop. This proves local wiring, not native Chrome installation, dialog behavior, responsive visual appearance or live cloud transfers.

TRUE REMOTE tests prove that the Beta forwards only URL/destination metadata into the original `ingest` route and never fetches source bytes locally. Live source acquisition, object integrity and right-click parity still need owner-environment acceptance.

Remaining product limitations and the smallest useful next acceptance task are in [EXPLORER.md](EXPLORER.md). This checkpoint is useful implementation progress, not a shippable-beta certification.
