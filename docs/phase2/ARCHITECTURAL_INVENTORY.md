# P2.0 source audit and preserve/rebuild inventory

Inspected baseline `ec6d5cfc964e1fe2b3d73403a5cf8d5dc0555059`, Linux / Node 24.19.0, 23 October 2026. The initial directive is retained in Phase/PHASE_2_IMPLEMENTATION_DIRECTIVE.md, with the owner's governing Beta addendum. New implementation is isolated on `phase2/beta-explorer-foundation`; no worktree. `verification/baseline-reliability.json` is a fresh, pre-edit local run: **375 tests, 365 pass, 10 fail**, no skipped. Syntax, API registry and issue inventory pass; Explorer architecture fails. This reproduces the existing failure atlas. The runner calls three of those “new” relative to its older seven-failure allowlist; they were observed before this change. No installed Chrome or provider result is inferred.

## Source-backed operation traces

Current source was inspected rather than adopting the historical OPERATION_CATALOG as current behavior (its upload narrative is superseded).

| User operation | Actual source path / symbols | Verification and failure boundaries |
|---|---|---|
| Copy, cut, paste | options.js `setExplorerClipboard` → `pasteExplorer` → `cfTransferObjects`; background.js `transferExplorerObjects` → `expandExplorerEntries`, `preparedProfile`, `assertExplorerTransferSettings` → `callBucketWorker(transferBatch)` → embedded `WORKER_SOURCE`, `copyVerifiedObject` | Exact keys and batch receipts checked; preparation may mutate infrastructure; no durable general coordinator; deployed Copy404 remains open |
| Move | Same transfer path → destination copied receipts → source Worker `deleteKeys` with expected source/destination identity | Preserve verified read-back and cleanup checks; batches can partially complete; runtime/provider acceptance unknown |
| Rename | options.js rename handler → `cfRenameEntry` → background.js `renameExplorerEntry` → move with renameTo | Preserve same-folder intent and conflict refusal; do not substitute separate sample Worker |
| Delete | options.js delete confirmation → `cfDeleteObjects` → `deleteExplorerObjects` → recursive expansion → Worker `deleteKeys` | Exact deleted-key receipt checked; expansion and batches are not one directory transaction |
| Upload | options.js `uploadLocalFiles` → `inspectLocalUploadObject` → `RedownCloudflareApi.request(PUT /accounts/.../r2/.../objects/...)` → `recordLocalTransfer` | Current direct management API route, not historical Worker upload narrative. Absent-check and PUT race; File references/queue die with page; size is not content hash; ambiguous writes not auto-replayed |
| Download | options.js file context action → cloudflare-api.js download path → authenticated object read → Chrome download | Start acknowledgment and native completion differ; no independent content-integrity evidence |
| List / navigation | options.js `goLocation`, `browseWorkspace` → `cfObjects` → background.js `listObjects`, `listObjectsPage` → Cloudflare management objects API | Cursor and malformed responses validated; optional RFIS observations are not storage truth; recovery may prepare Workers |
| Search | options.js progressive `cfSearchStart` / `cfSearchStep` / `cfSearchCancel` → background handler → search-session.js, listing | Bounded caller-driven pages; worker restart interrupts rather than durably resumes; legacy `searchExplorerObjects` remains another path |
| Preview / lightbox | options.js `previewExplorerItem`, `showWorkspacePreview` → cloudflare-api.js private object fetch → Blob URL / preview renderer | Retain abort/generation protection, resource cleanup and loop navigation; archive preview is a separate message/Worker path |
| Authentication | cloudflare-auth.js PKCE/state/callback → persisted OAuth; cloudflare-api.js auth/request/refresh; background Worker secret/profile cache | OAuth and Worker Bearer are separate authorities; 403 alone cannot identify expiry; preparation is not inspection |

## Decisions and obligations

| Surface | Decision | Reason / preserved obligation |
|---|---|---|
| options.html/options.js production Explorer, keyboard, rows, lightbox, Get URL, selection, animations | Preserve unchanged operational routes | Owner Beta requirement; current shape, semantics and visual assets remain fallback |
| options.js `betaModeEnabled`, `applyBetaMode`; options.html `.beta-only` | Reuse and extend with separate link | One existing feature gate; Beta direct page independently checks that same setting |
| cloudflare-api.js / cloudflare-auth.js | Preserve; candidate future scoped connection adapter | Reuse shared auth serialization and exact-key encoding after inspecting mutation/retry boundaries; never export tokens into Beta journal |
| Embedded Worker safe-copy / conditional writes / read-back | Preserve as R2 adapter reference | Existing successful algorithms and tests are useful; does not certify production or remove concurrent-delete risk |
| search-session.js, explorer-destination-menu.js | Preserve as reusable UI/algorithm references | Complete bounded navigation and stale async guards must survive; no direct reuse as a universal coordinator |
| public-addresses.js, explorer-status.js | Preserve | Shared status tickets and configured-versus-verified URLs; no parallel URL formula or fake success |
| Operational coordination in options/background | Rebuild behind versioned contract, incrementally | Provider-specific preparation, folder expansion, conflict mapping and UI state intermingle; upload uses another executor and queue |
| State ownership | Separate presentation from jobs | workspaceTarget/prefix/selection/clipboard belong to UI; profiles/session caches/auth own connection state; transferHistory, RFIS, passive traces are different bounded observations; none is a canonical durable job journal |
| agent/diagnostics gateway and agent/explorer | Preserve; future observation adapter required | Do not create a competing issue lifecycle. Prototype engine inspect is local library access, not a second project-wide diagnostic server |
| Forever Works checkpoint and frozen catalogs | Preserve byte-for-byte | Append scoped current evidence; no refreshing historical hashes to hide drift |

## Risk priorities and missing evidence

P0: BUG-019 directory conflict/merge reports, upload conditional-create race, ambiguous writes, exact identity before source cleanup. P1: Copy/Move/Paste404 routing and deployed version, settings-page job lifetime, stale/missing destinations, permissions versus expiry. P2: completeness, accessibility, modest-hardware performance and release/license readiness. Reports are not verified causes. Existing fixes remain fixture/source evidence until installed and authorized live tests pass.

Missing recovery: universal durable operation IDs, externally reconciled receipts, restart-safe local file acquisition, safe external write retries, executor selection, full chain correlation, cross-provider capabilities. The smallest safe new boundary is a pure versioned request/identity/state contract plus a deterministic local simulation with an atomic storage interface. It is **not yet a cloud-capable replacement engine**. No real provider or destructive route was migrated.

Primary inspected records: FOREVER_WORKS README/CURRENT_STATE/FAILURE_ATLAS/GAPS_AND_MIGRATION/RECONSTRUCTION/COLD_AGENT_START_HERE/PROVIDERS; Phase charter; COMP README and AGENT_API_STRENGTHENING_HANDOFF; AGENTS; unified diagnostic contract; source architecture and operation catalog; Explorer HANDOFF. Competitive claims were used only as requirements, not independently refreshed external facts.
