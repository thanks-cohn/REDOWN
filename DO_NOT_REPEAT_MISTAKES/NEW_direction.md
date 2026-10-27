# REDOWN — NEW DIRECTION: CLEAN-SLATE BUILD, WORKING EXTENSION FIRST

**MANDATORY PRODUCT DIRECTIVE — START FROM SCRATCH**

**Goal:** Ship a working Chrome extension that provides an intuitive cloud file explorer and genuine TRUE REMOTE downloads. Build one straightforward universal file API, implement Cloudflare R2 as its first fully functional provider adapter, publish a usable Cloudflare-first product, and only then connect additional cloud providers through adapters.

**This is a new implementation, not a repair project.** Do not inherit, reuse, refactor, port, migrate, or depend upon previous REDOWN engines, adapters, experiments, architecture, laboratories, or application code. The existing repository is a place to receive the new implementation and this directive, not an implementation baseline. No past issue, historical failure, test corpus, telemetry system, or former design is a prerequisite. Begin with the product behavior defined here and authoritative provider documentation. Keep the previous implementation untouched and isolated; no rollback or deletion is required to author new work.

## 1. Build the product the owner requested

A person installs the extension, securely connects their Cloudflare account, opens a bucket, and manages files in a familiar desktop-style explorer. They can upload and download files, copy and paste, cut and move, rename, overwrite when explicitly chosen, delete, create and organize folders, handle multiple selections, search and navigate. They can also send a supported web URL directly to their cloud storage through TRUE REMOTE, without having their device download and re-upload the content.

**The user interface is the product. The API exists to execute its actions.** Every enabled GUI operation must perform real work and truthfully reflect the outcome. Do not add architecture as a replacement for working functionality. Do not announce completion based on source code, simulated data, mock success, or a green test suite without proving the installed extension does what it promises.

## 2. Simple design, one API

`Chrome extension GUI / context menu → universal file API → selected provider adapter → real cloud provider`

Create a minimal, coherent API with operations for:

- Authenticate/connect/disconnect; select account and storage container.
- List, paginate, navigate, search, stat, and read metadata.
- Upload/write streams; download/read streams; create empty and nested folders.
- Copy, paste, duplicate, move, rename, delete, and explicit overwrite.
- Batch operations and conflict decisions: replace, skip, keep both, cancel.
- Progress, cancellation, truthful per-object results, and recovery of uncertain outcomes.
- TRUE REMOTE ingest: supported URL → cloud destination through remote execution.

Do not turn every GUI interaction into a cloud mutation. Selection, keyboard shortcuts, clipboard intent, layout and navigation history may be local state; when the user confirms a file operation, the API performs the actual cloud operation.

**No competing engines. No extra infrastructure without a demonstrated product need.** An implementation may compose multiple provider calls to deliver a familiar operation. Do not demand atomic multi-object transactions where the provider does not offer them. Verify a move's destination before removing its source; accurately describe partial completion, and never delete unrelated data. These are ordinary file-management safeguards, not grounds to disable the feature.

## 3. Cloudflare R2 first

Implement the Cloudflare R2 adapter directly against current, official Cloudflare documentation and the actual available authentication/API/Worker capabilities. The extension must support the real provider rather than an imagined generic filesystem. A folder may be a logical key prefix or a suitable marker object; implement the behavior people expect from an explorer.

Where browser extension security, credentials, cross-origin fetching, large files, or TRUE REMOTE require a Cloudflare Worker or another minimal remote component, use the smallest suitable implementation. Keep credentials protected, restrict access to authorized buckets and keys, and do not route TRUE REMOTE file bytes through the user's machine. Separate local upload/download (which necessarily interact with the user's device) from TRUE REMOTE cloud-side acquisition.

Do not build the other provider adapters yet. The first adapter and the full GUI must work with Cloudflare before expanding.

## 4. Functional requirements: what must actually work

**Accounts and browsing:** connect, authorize, reconnect, list authorized buckets, open folders, back/forward/breadcrumb navigation, refresh, paginate large listings, search, inspect file properties.

**Uploads:** single file, many files, entire folder trees, nested paths, empty files, large files with bounded memory, Unicode filenames, explicit collision choices, progress and cancellation.

**Downloads:** single file, multiple files, folders, large files with bounded memory, correct filenames/paths, integrity checks and clear completion status.

**Organization:** copy and paste, cut and paste, duplicate, drag/drop, file and directory move/rename, new empty folders, populated directory trees, file/folder deletion, bulk selection, exact source/destination handling, and explicit overwrite/skip/keep-both/cancel.

**TRUE REMOTE:** right-click or supply a supported URL, select bucket and path, initiate cloud-side acquisition, inspect outcome/progress, and find the resulting file in Explorer.

**Predictable failures:** errors must state what failed and whether anything changed. Long transfers should report meaningful progress. Do not claim success before a provider-confirmed result and relevant integrity checks. Avoid blind retries after uncertain writes; check provider state before deciding what to do next.

Implement everyday keyboard shortcuts and context menus through the same API as toolbar buttons and drag/drop. Don't ship active controls that call unsupported stubs.

## 5. Implementation sequence: produce usable functionality immediately

1. Establish a **new, isolated clean-slate implementation** with the smallest possible extension structure, basic authentication and R2 bucket listing. No dependency on earlier REDOWN application modules.
2. Implement and prove opening folders, upload and download of real bytes, then create folder, copy/paste, rename, move, overwrite and delete. Make each operation accessible and usable through the actual GUI as it is completed.
3. Add file/folder selection, drag/drop, keyboard/context-menu actions, batch operations, collisions, progress and cancellation. Keep behavior consistent across interaction methods.
4. Implement genuine TRUE REMOTE into Cloudflare with secure authorization, explicit destination and verified result.
5. Test a realistic range of file sizes, binary formats, Unicode names, nested directories, conflicts, interruptions, and bulk actions directly against an authorized isolated Cloudflare R2 test bucket. Independently compare uploaded and downloaded bytes and confirm the state changes that the GUI reports. Measure practical transfer latency and bounded memory without constructing a separate observability platform.
6. Package and ship the Cloudflare-first extension once the actual installed product passes core user workflows, security and integrity checks. Publish only verified functionality; clearly identify limitations without disguising missing basics.

Use small implementation-and-test cycles. Fix the immediately failing action before adding more features. No speculative architecture, ceremonial milestones, heavyweight laboratory, elaborate trace subsystem, broad redesign, or provider expansion ahead of a working release.

## 6. Adapter expansion after Cloudflare release

The universal API is intentionally reusable, but its first job is to make Cloudflare work. After shipping, add **one independent adapter at a time**. Prioritize S3-compatible endpoints where relevant, then providers such as Google Drive, OneDrive and MEGA according to user value and available APIs. Validate each provider's actual authentication, listing, read/write, copy, rename, move, deletion, overwrite, folder conventions, size constraints and TRUE REMOTE feasibility. S3 compatibility does not mean unrelated services expose S3 APIs.

All providers should power the **same** Explorer UI. Adapter differences must be translated into honest supported behaviors, not reflected back to users as a broken generic interface. Each adapter must pass real end-to-end provider tests before advertising support. TRUE REMOTE must truly execute away from the user's computer, or be honestly described as unsupported for that destination.

## 7. Definition of done

**Done means an ordinary user can install REDOWN, connect Cloudflare, organize files with all normal explorer actions, transfer data accurately, and send a URL to R2 via TRUE REMOTE without wrestling with the engineering beneath it.** The GUI and universal API must be one functioning product; Cloudflare must be the verified first adapter; the extension must be packageable and releasable. Only then build the next provider adapter.

**START FRESH. BUILD THE BASIC PRODUCT. PROVE IT WITH REAL CLOUD OPERATIONS. SHIP IT. EXPAND THROUGH ADAPTERS.**
