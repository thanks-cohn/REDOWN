# Beta Explorer handoff, October 27, 2026

Branch: **beta-explorer**. Starting commit: `44f8505648b9b1008d93999a17ce3efbe9627a67`.

**Implementation commit: `9c06ce16896fd69e5ba9e177964501e1010cf218`.** The subsequent documentation commit contains this handoff and the verification record. Its final delivery SHA is provided in the delivery message and resolves through the branch head.

Status: **BUILT and LOCALLY TESTED. Milestone 1 live acceptance is UNVERIFIED.** No release, default-interface change, main update, deployment or live cloud mutation was performed. Original Explorer remains the default. This session implements the immediate roadmap, not the later parity inventory, Guided Testing system or docked Preview pane.

## What works in local product-path tests

- Existing shared Cloudflare authentication is reused. Beta discovers accounts and buckets automatically, including accounts beyond the first. A sole accessible bucket opens immediately; multiple buckets appear as direct sidebar choices.
- Successfully visited bucket/folder locations persist under `betaExplorerLocation`. Startup validates bucket accessibility before restoration. Removed saved folders fall back to the live bucket root; inaccessible saved buckets do not block available choices.
- The existing adapter lists actual Cloudflare REST objects when used in an authenticated installed extension. No simulated objects or new file engine were added to the product.
- Existing GUI selection, multi-selection, folder double-click, supported preview, clipboard, duplicate, rename, copy/move destinations, delete, upload, folder upload, dropped files/folders, download, properties, navigation/history/breadcrumbs, sort/filter and keyboard paths remain routed through the same universal API.
- A new GUI-driven 51 MiB fixture test uploads a File, checks stored bytes independently with SHA-256, renames, duplicates, cuts/pastes into a nested folder, checks bytes again, receives simulated Chrome download completion, and deletes the disposable copy. The original stays intact.
- Context menus omit unavailable commands. Unsupported preview formats offer Download; double-click downloads those files instead of advertising a nonexistent inline viewer. Existing ZIP/CBZ and supported preview behavior is preserved.
- Mutations refresh the visible list and retain their outcome message. Listing/loading/empty/disconnected/authorization/failure states are distinct; failed folder reads do not masquerade as empty folders.

## Intelligent Refresh and explicit setup

Refresh remains usable without a selected bucket. It refreshes live account/bucket discovery, restores a still-accessible location, reloads file contents, and reads Worker capabilities for the selected bucket. It identifies partial account discovery, auth/listing and Worker readiness failures. An outlined attention state points to intervention.

Browsing needs no Worker initialization. File changes require a ready safe-transfer Worker. Missing or obsolete setup produces an actionable message pointing to the existing **Set up right-click destination** button. That button still requires explicit confirmation and invokes the original provisioning service. Original advanced settings and Simple/Nested menu configuration remain available through the sidebar link.

`connectionStatus` is one additional read operation on the existing API. It reads saved profiles internally, checks the production Worker capabilities contract, and returns only readiness/reason, never credentials.

A small additive background-service change honors Beta's `betaNoProvision` flag. Beta copy/move/rename/delete/mkdir, archive operations and TRUE REMOTE refuse implicit Worker provisioning. A Worker 401 after readiness does not trigger repair/replay for these Beta calls. **Legacy calls omit the flag and retain their existing defaults.** This shared-file change is necessary to enforce the requested infrastructure safety boundary, not a replacement transfer implementation.

## Verification

| Check | Result | Evidence scope |
| --- | --- | --- |
| Beta tests | 45 passed, 0 failed | jsdom GUI and provider/Worker fixtures |
| Focused Beta, copy, Worker, auth/session/reconnect tests | 109 passed, 0 failed | local fixtures |
| Full suite | 419 tests: 409 passed, 10 failed | local repository |
| Starting-commit full suite | 408 tests: 398 passed, same 10 failure names | clean git-archive baseline, same dependencies |
| Syntax, API registry, issue inventory | passed | local checks |
| Architecture/reliability gate | failed | architecture already partial on baseline; stored allowlist recognizes only 7 of the 10 baseline test failures |
| Installed extension | BLOCKED | `CHROME_NOT_AVAILABLE_ENOENT`, no Chrome executable |
| Live R2 and original installed Chrome TRUE REMOTE | UNVERIFIED | no authenticated installed extension or approved disposable namespace available |

The full suite is **not green**. No failing assertions, frozen historical hashes or regression allowlists were relaxed. Exact failure names, scoped commands, source SHA-256 values and the blocked Chrome attempt are recorded in [MILESTONE1-VERIFICATION-2026-10-27.json](MILESTONE1-VERIFICATION-2026-10-27.json).

The local fixture exercises the actual embedded production Worker. It does not prove Cloudflare permissions, installed-extension UI behavior, downloaded disk contents or production memory use. Chrome downloads are simulated. No live access, deployment or live SHA-256 pass is claimed.

## Remaining work and restrictions

- Owner-installed Chrome must demonstrate login/discovery, real files, navigation and the full disposable-object lifecycle. This is the outstanding Milestone 1 exit gate.
- Existing direct local-upload route still limits files to **300,000,000 bytes**. Existing Worker TRUE REMOTE limits/deadlines remain in force. No multipart or unrestricted-size claim is made; pagination is unchanged.
- Folder downloads, preserving empty dropped directories and durable transfer recovery remain incomplete. Filtering covers loaded items; it is not a new recursive search implementation.
- A saved empty R2 folder is recognized through its existing marker objects. R2 has no native empty directories.
- Full Legacy-versus-Beta parity, the complete right-side Preview pane and Guided Testing remain deferred.

## Owner action and next highest-value task

Load this branch in an approved Chrome extension environment and use the existing Cloudflare login. Beta should open the last accessible location or sole bucket automatically. If writes need setup, confirm the existing destination setup button for the intended bucket.

Use an explicitly disposable prefix in an owner-approved R2 bucket. Upload the existing 51 MiB case, independently download/read it and compare SHA-256, then rename, duplicate, move to a nested folder, download and compare again, delete only the disposable objects, and Refresh to confirm provider state. Separately exercise the original Chrome right-click TRUE REMOTE path with an approved URL. Capture actual errors if anything fails.

**Next highest-value task:** execute that installed-Chrome/live-R2 acceptance workflow and fix any observed product-path failures before beginning Milestone 2. The implementation is not promoted to the default.

Publication uses the connected GitHub Git-data API because terminal push lacks credentials. Updates use an expected-head lease, without force. Local and published Git trees are compared before delivery.
