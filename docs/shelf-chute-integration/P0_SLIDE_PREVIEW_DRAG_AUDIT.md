# November 5 source-first audit

Base: `8a3c5e1e041832d16bac09d75a765d202b27e3a0` (fresh origin/main).
Dedicated branch: `feat/shelf-preview-splitter-chutey-reliability`.

| Responsibility | Existing owner / observed behavior |
|---|---|
| Routing/settings | shelf.js/html/css: hidden route states, REMOTES default and separate last-view opt-in; no entrance preference |
| Explorer | shelf-explorer.mjs/css/model: mounted tree/list, sorted filtered virtual offsets, lazy <=256 KiB originals, 3 reads/16 URLs; full-width variable-aspect media already exists |
| Divider | setFolderWidth clamps 15–75; CSS percent track plus 8px can exceed available width at 100; entry reset 50 remains intentional |
| Preview | select calls side (including arrows); double-click/Enter calls Window Preview; bottom sibling dock 33%, manual resize, cancellation epochs |
| Cloud authority | createFileApi(createR2Adapter()): stat and readStream; REST authorized via existing Cloudflare API, no new engine needed |
| Gesture producer | chute-drag.mjs synchronously assigns UUID, reserves/arms then stat/read/stat; 60s read deadline and 60s reservation start together |
| Private transport | chute-stage.js IndexedDB files store; reserve/put clears the entire store, including another Shelf's active lease; fulfillment atomic |
| Receiver broker | chute-worker.js exact Shelf arm, HTTP receiver tab/frame/origin one-use claim, ordered chunks; finish deletes on both failed and dispatch |
| Destination | chute-content.js trusted-drop guard, original File/DataTransfer; dispatch classification only, no verified saves or History |
| Lifecycle/permissions | service-worker imports existing stage/worker; alarms expiry; no native permission. Broad existing HTTP receiver content script. No permission expansion planned |

Confirmed source defects: selection initiates Preview; explicit image open uses wrong renderer; splitter cannot collapse; cross-instance staging replacement; no bounded reusable bytes after ambiguous dispatch; arm/claim/read deadlines can expire at the same boundary. These are independently testable code defects, **not a live root-cause claim for the reported “could not download” incident**.

Unknown: actual provider authorization/read error, installed first-drag behavior, browser restricted page acceptance, live target attachment/upload and Windows behavior. Existing evidence is controlled Linux HTTP fixtures, not installed/live proof. Current managed extension policy and Chrome version will be rechecked. Do not alter historic evidence or assume old test counts are current. Full baseline runs in an archived clean source snapshot with the same installed dependencies.

Implementation boundaries: retain Universal File API, private IndexedDB, existing worker/content adapter and shared renderer. Add preferences and bounded reusable staging to those owners; no provider mutation, public URL, native helper, deployment or main merge. Four implementation commits keep entrance, geometry, Preview and staging independently reviewable. New fixtures must exercise actual DOM events and broker/store behavior, including stale reads, fresh capabilities, identity validation, quotas and cleanup.
