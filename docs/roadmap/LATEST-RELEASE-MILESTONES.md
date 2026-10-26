# REDOWN: latest release milestone map

**Updated:** 2026-10-26  
**Status:** Working development plan, not shipped-feature or certification claims.  
**Core product promise:** Install extension → sign into a provider → right-click → save → organize. Minimal learning required. Basic useful workflows free; paid features add convenience, automation and organization at scale.

**Canonical current live-testing baseline:** [2026-10-26 R2 Quick owner baseline](../laboratory/QUICK-R2-OWNER-BASELINE-2026-10-26.md). This roadmap supersedes earlier exploratory plans **as a priority order**, not as a replacement for technical acceptance contracts.

## Current verified progress and boundaries

Owner-reported Python client 0.5.5, branch `fix/lab-result-codes`, R2 bucket `test-1-new`: 2,221 files totaling 157,571,693 bytes inventoried and hashed; **926/926 Quick planned cases PASS**, no FAIL/BLOCKED/INDETERMINATE/NOT_TESTED within the plan; **308 verified uploads, 308 verified reads, 308 metadata checks**, **2,809,232 verified bytes**. Real extension/native pairing, Doctor and progress display worked. **Overall acceptance INCOMPLETE**: 1,913 excluded from Quick coverage, including 192 limited by 65,536-byte transport and 1,721 excluded by sampling. Six operations were declared unsupported in the copied summary. These are not transfer failures and are not proof of unsupported-feature correctness. Full per-case local JSON remains the authoritative evidence; do not commit sensitive raw reports.

## Release sequencing and gates

### M0. Preserve the successful baseline (NOW)
- Retain local full JSON, Markdown companion, owner runtime/commit IDs, Worker capability snapshot, and any checkpoints; use the committed owner-summary as the navigable development record.
- Make the successful 926-case Quick run a regression fixture and avoid conflating communication `RESPONSE_RECEIVED` with verified bytes.
- **Gate:** reproducible, versioned, evidence-backed baseline without leaking secrets.

### M1. Expand small-file coverage before writing major infrastructure (NEXT)
- Execute the Comprehensive suite over all *eligible* small files with a **fresh, explicitly approved test namespace**. Record case coverage, duration, failures, limitations and recovery.
- Identify which of the 192 size-limited files can be addressed only after improved transfer support.
- **Gate:** all eligible supported small-file cases accounted for; no unsafe replay, no unexplained missing coverage.

### M2. Larger-file and real-media transfer testing (NEXT, incremental)
- Design and implement a bounded-memory stream/chunk upload and readback contract compatible with the universal engine. Use provider-specific multipart/resumable mechanics behind the adapter; do **not** raise the existing 65,536-byte conditional-create request cap as a fake solution.
- Start with owned test fixtures and legitimately obtained real downloads: JPEG, PNG, WebP, GIF, HEIC where supported, PDF, MP4 and ZIP. Include exact-byte integrity, EXIF/metadata if relevant, filename/extension/MIME mismatches, odd names, nested paths, redirects, content-length errors, duplicates and interrupted transfers. Avoid distributing copyrighted or private sample contents in the repo.
- Use a small **size ladder**, e.g. 64 KiB boundary, 256 KiB, 1 MiB, 8 MiB, 32 MiB, 100 MiB, then larger only after each gate passes. Fewer larger files are appropriate. Record peak RAM, throughput, latency, retries, and post-restart correctness without expensive default monitoring.
- Test unexpected disconnect, provider auth expiry, corruption, idempotency, duplicate keys, safe resume and uncertain writes. Do not simulate a successful transfer by merely receiving a provider success response.
- **Gate:** independently hashed upload/readback for every supported size tier, bounded resource usage, and truthful failure evidence.

### M3. Freeze thin universal file-operation contracts
- Preserve stable file identity and revision, capability declaration, streaming request/response shapes, operation states, progress events, authorization, verification, immutable evidence references, local metadata catalog schema and durable intent journal.
- Use **one** operation coordinator and error/result-code subsystem, not competing APIs. Distinguish local cached organization from actual remote writes.
- Explicitly declare emulated vs native vs unsupported operations; protect delete/move with revision checks and copy–verify–then-delete semantics where appropriate.
- **Gate:** contracts tested against R2's real supported operations without broad speculative refactoring.

### M4. Extract Cloudflare R2 as a provider adapter
- Separate R2-specific auth, Worker endpoints, bucket semantics and multipart mechanics from universal operations. Preserve existing working behavior and checkpoint compatibility.
- Run the same small and large file acceptance suite *before and after* extraction, compare outcomes, throughput, memory, integrity and recovery.
- **Gate:** zero unexplained regression, identical evidence semantics.

### M5. Build the thin, appealing everyday explorer
- Directory browsing, search, navigation, previews, right-click, copy/paste, drag/drop, queue status, explicit rename/move/delete, destination selection, and safe conflict handling.
- Build atop the existing universal engine and small catalog; UI only displays or requests authoritative operation states, never invents success.
- Keep ordinary actions browser-only when practical; use the native helper for local files, sustained jobs and advanced offline workflows.
- **Gate:** ordinary user can find, move, save and verify content without documentation or a Python CLI.

### M6. Mainstream providers and browser value proposition
- Add Google Drive, then OneDrive via provider-native OAuth/API and resumable mechanisms. Each goes through the same capability-specific Laboratory suite, never assumes identical folder or revision semantics.
- Add reliable browser right-click Save to cloud and remote URL download; then basic screenshot and selected-area capture to a chosen provider.
- **Gate:** install → login → right-click → save → verify works reliably across R2 and at least one mainstream provider.

### M7. Free public beta
- Friendly onboarding, clear free-tier utility, discoverable help, easy uninstall/revoke, privacy and security review, safe upgrades, diagnostic export and support channel. Public release requires successful real-user testing, not just Laboratory PASS.
- Do **not** wait for five perfect providers, drive mounting or LLM features before seeking outside-user feedback.
- **Gate:** stable installs, permissions, recovery, transfers, UI, user trust and privacy.

### M8. Distinctive organization and optional Pro
- Smart Consolidate across providers with **virtual catalog view default** (no implicit remote moves), or explicit verified copy/move preserving source hierarchy.
- Offline metadata/thumbnail catalog with durable local changes and honest sync/queued/blocked semantics; optional adjustable cache budget; vaults excluded from indexing/search/tagging by default with explicit user consent to inspect.
- Scrolling/full-page screenshot capture; optional desktop Tagger Light/Medium/Heavy under resource controls and explicit opt-in for expensive/local model processing.
- Versioned file-history events from first supported operations; later searchable historical directories and optional protected backup vault. A hash or thumbnail alone never restores missing bytes.
- **Gate:** repeatable user value; premium pricing (`$5/month` or `$20/year` is a proposal, not established unit economics) validated with user demand and operating costs.

### M9. Wider competitive capabilities
- Dropbox; S3-compatible service expansion; safe cross-cloud transfers; scheduling, rule automation, bulk operations; eventual desktop-drive integration and LLM plugin only after stable catalog, permission and provider contracts.
- **Gate:** shared acceptance passes per provider and advertised feature. Five documented, tested advantages per competitor are a *planning objective*, not current competitive claims.

## Non-negotiable design rules

1. Preserve purpose, user workflows, file identity and security obligations during refactoring; working implementation is evidence, not a mandate to rewrite.
2. Light background metrics by default; medium/heavy diagnostics opt-in; stable canonical error and result code registry.
3. Vault excluded by default from automatic indexing, hashes, previews, tagging, semantic search and agents. No vault contents accessed based on a historical hint alone.
4. Never auto-repeat uncertain mutations or delete a source until a supported verified, authorized, conflict-safe action explicitly allows it.
5. Cloud credentials stay with the authorized authentication subsystem. No new all-powerful background service just to support UI convenience.
6. Prefer compact ongoing fixtures and representative real-world file families; run the full large corpus at milestones.
7. Every status communicated publicly distinguishes: implemented, owner-observed, independently verified, excluded, planned.

## Immediate Work / Codex assignment

**Task:** Archive the completed Quick evidence, then execute/prepare Comprehensive small-file acceptance; inspect coverage gaps, and implement the smallest safe bounded-memory large-file R2 path with verified readback and reproducible size/file-type fixtures. Preserve the successful Quick run as a regression baseline. Do not yet rewrite the adapter, build a new UI subsystem, or start Google Drive. Give the owner exact Windows CMD approval steps and full case-coverage results. Escalate any live-work requirement that needs the owner's local directory, credentials or authorization.
