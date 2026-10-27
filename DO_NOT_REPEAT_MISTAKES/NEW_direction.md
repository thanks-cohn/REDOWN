# REDOWN — NEW DIRECTION: WORKING EXTENSION FIRST, UNIVERSAL API THROUGH PROVIDER ADAPTERS

**Owner directive — priority: CRITICAL / MUST FOLLOW.**  
**Product:** REDOWN browser extension with a real cloud file explorer and TRUE REMOTE downloads.  
**Immediate release target:** Cloudflare R2 Beta. **Next:** other providers through adapters to the same proven API.  
**Related:** `DO_NOT_REPEAT_MISTAKES/README.md`, `DO_NOT_REPEAT_MISTAKES/BASIC_requirements.md`, GitHub issue #41.

## 1. Non-negotiable outcome

**SHIP A WORKING EXTENSION, NOT AN ENGINEERING EXPERIMENT.** The owner wants users to connect Cloudflare, browse buckets/folders, upload and download files, copy/paste, cut/move, rename, overwrite when chosen, delete, create folders, perform bulk operations, and send URLs/files to Cloudflare by TRUE REMOTE. The GUI must invoke one dependable file-operations API and show truthful results. Everything needed to do these operations should work in the actual installed Chrome extension and on real R2, not only in fixtures or documentation.

Do not attribute failures to an unclear or changing owner requirement. The product objective has been consistently clear: a usable, shippable extension with Cloudflare functioning now and other providers added later. The universal API is a means to deliver that product, not a substitute for it.

## 2. The practical architecture, and no more

**GUI / browser interactions → one file-operations API → Cloudflare R2 adapter → real R2 operations.** TRUE REMOTE uses the authorized remote execution path so remote source bytes do not travel through the user's PC. Later, add `S3-compatible`, `Google Drive`, `OneDrive`, `MEGA`, or other provider adapters **only when actually needed**, reusing the same user-facing operation semantics.

A provider adapter maps capabilities and authorization into concrete operations: `list`, `stat`, `read/download`, `write/upload`, `copy`, `move`, `rename`, `delete`, `mkdir`, `overwrite`, `batch`, and necessary streaming/progress primitives. Not every provider offers the same native calls. Compose ordinary semantics when safe; distinguish native vs composed operations; return honest partial outcomes. Keep the product-level contract stable without imposing the least capable provider's limitations on Cloudflare.

**Do not make exotic guarantees prerequisites to ordinary actions.** Cloudflare R2 does not offer an atomic multi-object filesystem transaction. Do NOT disable normal delete/rename/move merely because revision-conditional atomic deletion is unavailable. Make correct authorized calls, verify destination before source deletion for moves, handle conflicts, acknowledge non-atomic partial completion and reconcile uncertain outcomes. Do not silently corrupt, overwrite or delete unrelated data. This is practical safety, not pointless architectural purity.

Reuse the existing working Explorer routes and existing Cloudflare authentication, Worker and TRUE REMOTE behavior where they work. Keep them available until each replacement has demonstrated real GUI/provider parity. Do not launch a parallel core, replace UI for fashion, rewrite proven code for consistency, or pile on speculative abstractions.

## 3. Cloudflare Beta: exact definition of done

The shipping GUI must genuinely support all essential user-visible operations from `BASIC_requirements.md`, particularly:

1. Connect/reconnect Cloudflare account, select bucket, browse and refresh folders, paginate, search and view metadata.
2. Upload local files and directory trees, including zero-byte, Unicode, small and large files, with bounded-memory transfer.
3. Download individual files and folders, verify correct bytes and preserve names/path structure.
4. Copy/duplicate and Ctrl+C/Ctrl+V within and across authorized folders; source remains intact.
5. Cut/paste and move files and populated folders; confirm target and correctly remove old source, with clear partial outcomes.
6. Rename files/folders; create empty/nested folders; drag/drop and context menus must trigger the same API operations.
7. Delete individual, multiple and nested objects with explicit user intent and accurate absence confirmation.
8. Handle overwrite/skip/keep-both/cancel, duplicate names, multi-selection and meaningful progress.
9. TRUE REMOTE from a supported URL directly into R2, with clear success/failure and visibility in Explorer.
10. Failures must identify where the operation stopped and preserve a safe, actionable result; cancellation and recovery must not invent success.

Advanced offline queues, rich previews, multi-provider support, generalized agent abstractions, and expanded diagnostics are **post-Beta unless already proven and nonblocking**. Do not promote those features ahead of the release essentials.

## 4. How to finish: execution order, not another proposal

**First:** Compare every current GUI action against the legacy working Explorer and the new API. List only actual missing/broken behaviors; inspect Cloudflare documentation, adapter code and Worker code. Preserve or restore working paths immediately. Resolve basic CRUD capability gates, including `UNSUPPORTED_ATOMIC_DELETE` and absent overwrite, using correct R2 semantics and bounded safeguards.

**Second:** Repair the confirmed 50 MiB upload / `TRANSPORT_FAILURE` + `DIAGNOSTICS_LOST` incident (issue #41). Preserve root-cause evidence from the existing telemetry, not a new observability framework. Keep diagnostic overhead light; record meaningful operation latency/throughput and memory where measurable. Reconcile previously uncertain operations read-only before any new write. No blind replay.

**Third:** Exercise the full 12-file, exactly 209,715,200-byte corpus on an approved isolated Cloudflare R2 test namespace. Each file must actually upload, download, copy, move, rename, overwrite as authorized, and delete; folders and bulk operations must run through representative dependent workflows. Verify bytes with independent SHA-256 after content-preserving operations and verify source removal and deletion by actual remote state. Include interruption and collision scenarios. Never call fixture-only results “live passed.”

**Fourth:** Test the *actual installed extension GUI*: toolbar, context menus, keyboard copy/cut/paste, drag/drop, folder tree, progress, failure and recovery, and TRUE REMOTE. Capture a concise, reproducible list of pass/fail blockers. Fix failures in the smallest working slices and rerun affected tests. Keep original functioning routes as fallback until parity is verified.

**Fifth:** Package and ship Cloudflare-only Beta once these core flows are independently verified and no unresolved release-blocking data-integrity, authorization, or silent failure defects remain. Document real, known limitations instead of inventing guarantees. Release readiness is an evidence-based decision, not a count of source files, tests or architecture documents.

No time-consuming redesign, new lab platform, other provider integrations, UI repaint or generalized framework before this release. The owner wants the shortest path to a functioning product.

## 5. Subsequent multi-cloud expansion

After Cloudflare passes and the beta is shipped, add adapters one at a time to the **same** GUI and API. Prioritize S3-compatible endpoints for broad storage compatibility, then specific providers based on authentication, genuine TRUE REMOTE execution feasibility, demand and practical implementation cost. Explicitly verify which S3 APIs each service implements; S3 compatibility does not automatically make Google Drive, OneDrive or MEGA into S3 providers.

An adapter passes the same behavioral contract and an independent provider-specific live acceptance set before it is advertised. TRUE REMOTE must be evaluated separately per provider: authorization, remote fetch/execution architecture, network limits, source-server behavior, object integrity, and actual absence of the user's machine from the data path. If a provider cannot offer true remote under REDOWN's available architecture, state the limitation clearly instead of relabeling a local relay as remote.

**The rule for future contributors: add a working provider, not a new platform.** Each adapter should deliver more usable destinations without regressing Cloudflare or altering ordinary GUI behavior.

## 6. Forbidden regressions and success measure

Do not disable useful basic behavior solely to satisfy unnecessary atomicity. Do not create multiple competing engines or incompatible interfaces. Do not claim source inspection, mocks, Cloudflare metadata or status polling independently proves transferred file bytes. Do not produce another architectural roadmap in lieu of functional implementation. Do not remove historic evidence or overwrite the owner's old namespace. Do not make the owner repeatedly run the same broken test without fixing the identified blocker.

**Measure success by what a user can do inside the installed extension:** connect, browse, organize, upload, download, copy, paste, move, rename, delete, and TRUE REMOTE with correct results. **Cloudflare first. Ship. Then reuse the same API with additional provider adapters.**
