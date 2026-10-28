# MUST AUDIT BEFORE FURTHER BETA EXPANSION: LEGACY ↔ BETA EXPLORER FILE SIZE, ACTION, CAPABILITY AND PARITY INVENTORY

**Repository:** thanks-cohn/REDOWN  
**Working branch:** beta-explorer  
**Priority:** CRITICAL / BLOCKING DISCOVERY  
**Execution:** Investigate, verify, write durable living documentation, run non-destructive focused probes/tests, and commit all audit documents. **Do not implement a new file engine or expand features in this audit.**  
**Guiding requirement:** Beta Explorer must offer at least the same operational capability as Legacy REDOWN, and then surpass it, without duplicated engines, invented restrictions, or accumulated bloat.

## 1. Primary mission

Conduct a code-grounded, end-to-end comparison of **the actual Legacy REDOWN file explorer** and **the new Beta Explorer**. Establish, with evidence, which file operations are available in each, which work in real paths, and every applicable limit on file size, number of files, paths, nesting depth, time, buffering, concurrency, memory, providers, and transfer direction.

The owner specifically does not want Beta to impose arbitrary file-size constraints if the Legacy implementation already supports larger files or streaming/multipart workflows. Do **not** simply delete limit checks: determine which are artificial UI/code restrictions and which reflect genuine provider/API/runtime ceilings, browser constraints, Worker/platform limits, verification strategies, or missing infrastructure. Identify the precise code, call chain, rationale, and an actionable way to remove unnecessary ceilings while remaining correct. **Do not claim unlimited file support when the transport has an actual limit.**

This is a forensic inventory and parity plan, not a rewrite proposal.

## 2. Mandatory reference and version discipline

- Start on `beta-explorer` and identify the exact inspected commit SHA. Read project instructions, relevant tests, docs, `docs/beta/HANDOFF.md`, the consolidated Chrome bug report `docs/beta/BUGS-TEST-IT-REAL-CHROME-2026-10-28.md`, and `DO_NOT_REPEAT_MISTAKES/` guidance.
- Inspect *both* actual implementations, including UI, adapters, shared clients, Chrome extension background/service-worker routes, backend Cloudflare Workers, R2 providers, download/upload paths, file API, archive/preview routes, native/CLI components if they are already integrated, and feature flags.
- Trace legacy behavior from the button/command through transport/storage and verification, not merely by counting UI buttons.
- Retain and link evidence to source paths, functions, line numbers or symbols, tests, and documentation. Label runtime claims VERIFIED, CODE-INFERRED, or UNVERIFIED.
- Preserve existing tags, especially `test-it-chrome-56-of-60-2026-10-28` and `test-it-before-question-history-2026-10-28`. Do not modify `main` or rewrite either explorer.

## 3. Comprehensive hardcoded-limit audit

Search the entire relevant repository for every **numeric, typed, implicit, and dynamic** bound, including: `maxSize`, `file.size`, `Content-Length`, `MAX_*`, hardcoded byte constants, MB/MiB/GB, `16*1024*1024`, `300000000`, body/response limits, chunk sizes, `ArrayBuffer`, `Blob`, `FileReader`, `Uint8Array`, `readAll`, `buffer()`, `text()`, `json()`, `slice`, HTTP upload caps, multipart thresholds/part counts, streaming support, in-memory SHA-256 checks, file listing pagination, ZIP/CBZ/archive expansion limits, preview limits, downloads, retries, timeouts, API quotas, Worker request/subrequest limits, concurrency, batch sizes, memory budgets, and extension messaging ceilings.

**Known leads to inspect, not assume universally applicable:** earlier `extension/beta/r2-adapter.mjs` implemented an `inspect` path with a 16 MiB independent-check budget and an `upload` path rejecting files above a 300,000,000-byte direct-upload boundary; verify whether these still exist at audit HEAD, what actions they actually constrain, and whether Legacy has a larger/streaming alternative. Determine whether any Test It-specific constraints have leaked into regular Beta Explorer functionality.

For *each* limit, document:
- Exact value and units (decimal MB vs binary MiB), origin, code reference, and error message.
- Scope: Legacy / Beta / shared / Test It / Worker / provider / browser; affected direction and operation.
- Is it an explicit gate, implicit buffer/memory boundary, operational budget, real platform ceiling, or merely a UI suggestion?
- Whether the same ceiling applies to files of different types, providers, and routes; whether it can be bypassed by another existing route.
- Whether streaming, ranged reads, multipart upload, resumable transfers, chunked verification, and large-download handling already exist.
- What user-visible behavior happens at, just below, and just above the boundary.
- Whether the limit is required, accidental, stale, undocumented, or duplicated, and its proposed replacement strategy.
- Whether a full-file memory read or synchronous hash introduces an effective file-size limit despite no explicit gate.

Include a **size-boundary matrix** for 0 B, 1 B, 1 KiB, 1 MiB, 16 MiB, 100 MiB, 300 MB, 1 GiB, 5 GiB, and larger representative sizes, where meaningful. Tests must avoid moving large real user files or incurring unexpected cloud costs without authorization. Use code-path proof and synthetic/local probes when live large-size testing is unavailable. State what remains unverified.

## 4. Operation-by-operation Legacy ↔ Beta capability parity

Build an exhaustive two-column inventory plus gap assessment for actual supported operations, at minimum:
- Browse accounts, buckets, prefixes, deep folders, pagination, sorting, filtering, search, refresh, breadcrumbs, saved locations, history, selection/range/multi-select, view modes.
- New folder, folder upload, file upload, download, bulk upload/download, duplicate, rename, delete, copy, move, Cut/Paste, drag/drop, shortcuts, context menu, toolbar, conflict handling (skip/keep both/replace), overwrites, collisions, mixed-file/folder operations.
- Same-folder, same-bucket, cross-folder, cross-bucket, cross-account, cloud↔local, remote URL↔R2, remote↔remote transfers (report NOT IMPLEMENTED where applicable).
- Preview of images, text, PDF, audio/video where supported; archives (ZIP, CBZ and other types), archive browsing, extraction, URL/public links, file properties/metadata, status/progress/cancellation/retry/resume.
- Filename/path encoding, unusual Unicode, spaces, path separators, long names, deep nesting, zero-byte objects, huge counts, partial failures, idempotence, offline/connectivity interruption.
- Provider capabilities, authentication, bucket setup, extensions, security model and permissions, sync/offline features **only insofar as actually implemented**.
- Test It and its 60 exercise coverage as a test harness, distinguishing it from a production feature.

For every operation record: Legacy available/actual path, Beta available/actual path, size/count/path restrictions, underlying provider/Worker method, parity classification (`BETA-PARITY`, `BETA-BETTER`, `BETA-REGRESSION`, `LEGACY-ONLY`, `BETA-ONLY`, `BOTH-INCOMPLETE`, `UNVERIFIED`), evidence and a recommended repair priority. Distinguish UI affordance from a functioning full execution path, and do not overclaim live R2 verification.

## 5. Architectural reuse and bloat audit

Identify the existing robust legacy capabilities which Beta should **reuse or adapt** rather than duplicate:
- Shared transport and APIs, streaming/multipart logic, session/progress handling, selection/clipboard semantics, collision handling, worker operations, verified copy methods, archive and preview pipelines.
- Duplicated functions, duplicate provider adapters, redundant safety/capability checks, duplicated hashing/storage walks, overly specific Test It code paths, and repeated state synchronization.
- Architectural blockers preventing parity and the **smallest integration changes** that close each gap. Do not prescribe a second separate file engine.
- Separate intentional product differences from actual capability regressions.
- Identify observability/test gaps that can make a UI appear successful when the provider operation failed.

## 6. Deliverables: permanent living documentation

Place **permanent maintained reference documents** under `DO_NOT_REPEAT_MISTAKES/` (create a clearly named subdirectory for this audit if useful), with links from `docs/beta/HANDOFF.md` and relevant roadmap documentation. Minimum artifacts:

1. **`LEGACY-VS-BETA-EXPLORER-CAPABILITY-MATRIX.md`**: exhaustive action-level parity matrix with source references, real status, gaps and priorities.
2. **`EXPLORER-FILE-SIZE-AND-HARD-LIMIT-REGISTER.md`**: every size/count/depth/timeout/buffer/stream limit, exact code location, origin, scope, status, impact, removal pathway and verification.
3. **`BETA-EXPLORER-PARITY-ROADMAP.md`**: prioritized, small, dependency-aware set of implementation phases toward Legacy parity first, Beta superiority second. Rank largest regressions, especially needless file-size limitations.
4. **`EXPLORER-ARCHITECTURE-REUSE-AND-BLOAT-AUDIT.md`**: legacy paths suitable for reuse, duplicated paths to consolidate, smallest viable integration approach, measurable baseline.
5. **`EXPLORER-PARITY-ACCEPTANCE-AND-REGRESSION-PLAN.md`**: actionable GUI/API test matrix, boundary tests, expected evidence, provider/size/operation permutations, success metrics.
6. **`README.md`** (or index in that subdirectory): discovery entrypoint linking each permanent document and stating inspected commit/date, owner, status, how to update, and source-of-truth precedence.

These are living engineering references, **not disposable one-time audit notes**. State a maintenance rule: whenever a file operation, hardcoded limit, transport route, or provider capability changes, update the appropriate matrix/register and corresponding regression tests in the same PR/commit. Include a compact checklist for future contributors and a status timestamp. Prefer linking existing documentation to copying large passages. Integrate into `docs/beta/HANDOFF.md` and the existing roadmap rather than creating disconnected competing plans.

## 7. Verification and quality bars

- Use source searches and trace call graphs to confirm every advertised capability, then tests where practical. Cross-check Legacy and Beta at the same operation grain and data conditions.
- Run existing focused unit/integration tests and a full regression suite as available. Document commands, pass/fail counts, baseline failures, and version. Audit-only additions may include small non-destructive characterization tests or scripts, but **do not modify behavior or invent test outcomes**.
- For boundaries, evaluate both below and above each limit, with simulated or controlled files and no unauthorized large data transfers. Mark environment and confidence accurately.
- Make parity conclusions distinguish **guaranteed platform constraints** from **project-coded arbitrary limits**.
- Explicitly state which legacy features work with files larger than Beta's current effective maximum, and how.
- Deliver a top-line list of **every confirmed Beta regression** and the five highest-priority parity repairs with exact source code references.
- If direct live Chrome, cloud credentials, native environment or large-file verification is unavailable, document this as **UNVERIFIED**, not PASS.

## 8. Strict scope and acceptance

**Do the audit and documentation now; do not silently implement the whole roadmap.** No additional features, speculative frameworks, UI redesign, new backend platforms, automatic credentials setup, or broad refactors. This is a diagnostic prerequisite to further Beta work.

Acceptance requires: the complete Legacy/Beta action matrix; comprehensive hard-limit register; code-backed large-file path comparison; reuse/bloat assessment; phased parity roadmap; living documentation with maintenance rules; acceptance/regression matrix; update to HANDOFF and roadmap; tests/audit evidence; and a pushed commit on `beta-explorer`.

In the final response provide the commit SHA/link, all document paths, inspected revision, biggest Legacy-only/Beta regressions, most consequential hard limits, concrete next repair recommendations, tests and limitations.

## FINAL DIRECTIVE

**BETA EXPLORER MUST NEVER QUIETLY LOSE A CAPABILITY ALREADY AVAILABLE IN LEGACY.**

**WE NEED TO KNOW EXACTLY WHERE ITS FILE-SIZE LIMITS ARE, WHAT ENFORCES THEM, HOW LEGACY HANDLES THE SAME TASK, AND WHAT WE CAN REUSE.**

**COMPARE FIRST. DOCUMENT FOREVER. REUSE BEFORE REBUILDING. REACH PARITY BEFORE CLAIMING SUPERIORITY. COMMIT THE AUDIT.**
