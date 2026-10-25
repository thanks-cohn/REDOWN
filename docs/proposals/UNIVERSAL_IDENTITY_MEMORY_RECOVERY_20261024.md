# REDOWN — Proprietary Universal Identity & Recovery Platform
**Status:** Strategic architecture proposal, not implemented. **Date:** 2026-10-24. **Repository:** thanks-cohn/REDOWN.

## Founding vision
REDOWN aims to be the universal filesystem for humans and AI: users describe whatever they remember about a file and REDOWN locates, explains, traces, and—where verified backup bytes exist—restores it. Win initially through an exceptionally fast cross-device/cross-cloud identity memory, beautiful visual search and history, safety and agent operability, rather than claiming to match rclone's provider breadth today.

**Commercial boundary:** The API and CLI should expose *capabilities and results*, not proprietary identity algorithms, correlation heuristics, optimization architecture, training internals or implementation source. REDOWN's identity engine, scoring, indexing optimizations, correlation logic and specialist corpus/training may remain closed under the existing proprietary license. Stable opaque object IDs are externally visible; their generation and reconciliation internals need not be. Users must still be able to export their own original file metadata, virtual names, histories, relationships, snapshot manifests and recoverable data in documented portable formats. Do not make backup restoration hostage to subscriptions or a closed secret. Security relies on cryptography and access controls, not obscurity. Explicitly recognize that reverse engineering and competing independent implementations are possible; the moat must also consist of quality, performance, testing and accumulated engineering.

## 1. Universal Object Layer — durable meaning across media
- **Object** (durable human-meaningful identity), **Version** (revision), **Blob** (cryptographically identified exact bytes), **Location** (provider/account/path and observed state), **Placement** (virtual folder, collection, project or publication). Separate all five.
- Two identical byte sequences need not be one conceptual object; variants with different hashes can be related. Store verified evidence, tentative inference, provenance, human overrides and revision history; do not merge objects automatically based on names, metadata or visual similarity.
- **VINS / Long Names:** physical filename stays intact; optional essentially long user-defined display title, short title, aliases, tags, descriptions, original names and generated captions. Precompute compact/full projections, index all fields, never overwrite user text with model output. Virtual placeholders work even if the underlying data is offline.
- Loogal-style retrieval plus Atlas-style graph: files, URLs, media, RAWs, derivatives, archives, bookmarks, cards, projects and relationships. Selected cloud accounts and local directories share an identity-aware graph; project and directory collections can be virtual without moving bytes.

## 2. Memory, history, visual search
- Persistent Resource Atlas for selected local and cloud scopes: location history, path/name changes, hashes, media signatures, relationships, present/last-observed/missing/recoverable state, thumbnail references, verification timestamps and freshness.
- Append-only tamper-evident event/journal with immutable observations, operation/job provenance, actor, old/new path, time and uncertainty. A missing file is not automatically known-deleted. Disconnecting a provider does not erase identity.
- Folder Time Machine: aesthetic historical folder tree/cards and previews, calendar slider, changed/added/removed/renamed/moved diffs, historical locations, before/after snapshots, recognizable candidates and restoration actions only if content is recoverable.
- Memory search: “file that used to be in this directory,” “video of a red car and engine paperwork,” “find the original image,” “ten candidates that were in both clouds,” drag-and-drop screenshot/photo to visual similarity search. Explain match reasons, confidence, permission boundaries and last verification.
- Separate strong content hashes from sizes/provider ETags, perceptual image hashes, video/audio signatures and embedding similarities. A probable semantic match is not a verified duplicate.

## 3. Low-impact native indexing
- Fast native index (candidate Rust core + C ABI; evaluate against C/C++), SQLite/FTS initially, optional vector extension; incremental precomputed metadata, query plans and bounded caches. CLI, desktop GUI, browser extension, Python SDK, MCP and HTTP API share one engine/contract.
- Local OS filesystem notifications plus bounded reconciliation for lost events; remote change feeds or rate-limited polling according to provider capabilities. Track stable IDs where available, infer cross-volume/provider moves only with corroborating evidence.
- Configurable idle/locked-time processing, e.g. 100 files per batch *plus* byte/time/CPU/memory/battery/network caps. Fast metadata-first work; defer full hash, thumbnail and embedding; pause under system load, persist queues, resume after restart. No silent full-disk crawl, remote transfers or paid network work; user opts into scopes and budgets.
- Index queries must scale to >=40,000 file inventories without passing all objects into an LLM context. Benchmark cold/warm queries and stale-index reconciliation separately. Do not claim Loogal-equivalent performance before benchmarks.

## 4. Backup, deduplication, historic organization and exact restoration
- User-selected local/remote roots can be protected by versioned, encrypted snapshots in user-owned R2/S3/local/other storage; R2 may be recommended transparently, never mandated.
- Snapshot every logical tree entry including empty directories; map original path/name, long name, object/version, content blob/chunks, metadata, relationships, timestamps and supported permissions/symlinks. Persist versioned JSON manifests plus indexed state; document a portable restore format.
- Content-addressed dedup saves physical bytes while preserving *all* original logical file placements. The same stored blob can restore 10 different original files into exactly their recorded directories and names. Reconstruct a user's previous ordering, chosen layouts and relationships where represented by the manifest.
- Example savings **400 GB logical -> 300 GB physical** is hypothetical, content-dependent and must never be guaranteed. Show bytes saved, manifest overhead, provider billable sizes, backup versions, and projected R2 storage/request/egress costs. No claim of unlimited backup for $5/month.
- SHA-256 or stronger full-content checks for exact byte identity (chunk-level optional with robust encoding); verify upload completeness, manifests, encryption/key availability, periodic integrity and tested restores. Do not equate duplicate detection with permission to delete source files.
- No cleanup of the source until verified copies and recoverability checks, dry-run report, and explicit approval. Respect retention, object locks when supported, snapshot references, external provider costs, offline copies, ransomware resilience and separate failure domains. Garbage collect only unreferenced expired blobs.
- Restore by date, directory, object, or selected file(s): preview full logical paths and collisions, choose target, check costs, preserve versions and metadata where possible, resume safely, verify restored content and report unsupported metadata precisely.
- **Important truth:** A ledger can remember a deleted item indefinitely but can only restore bytes if a surviving or backed-up copy exists and remains accessible/decryptable.

### Example portable snapshot contract (illustrative only)
```json
{
  "schema": "redown.snapshot.v0-proposal",
  "snapshot_id": "snap_demo",
  "entries": [
    {"relative_path": "Cars/restoration.jpg", "kind": "file",
     "object_id": "obj_demo", "version_id": "ver_1",
     "blob_id": "sha256:EXAMPLE_DIGEST", "long_name": "Original restoration photograph"},
    {"relative_path": "Cars/edits/restoration-copy.jpg", "kind": "file",
     "object_id": "obj_demo_2", "version_id": "ver_1",
     "blob_id": "sha256:EXAMPLE_DIGEST", "long_name": "Duplicate copy"}
  ],
  "blobs": {"sha256:EXAMPLE_DIGEST": {"storage_uri": "r2:archive/blobs/example", "verified": false}}
}
```
This example is schematic; a production schema must handle lengths, security, checksums/signatures, directories, paths, permissions, versions, collisions, key manifests and recovery independent of REDOWN UI.

## 5. Proprietary engine, accessible API
Expose stable versioned operations, not secret internals:
```bash
redown capabilities --json
redown index scan --scope local:Pictures --json
redown search 'red car engine' --scope all --json
redown objects show obj_demo --json
redown identity trace obj_demo --json
redown objects locations obj_demo --json
redown files duplicates --mode verified --json
redown history directory local:Projects --at 2026-09-01 --json
redown backup plan --scope local:Projects --destination r2:archive --json
redown restore plan --snapshot snap_demo --destination local:Recovered --json
```
**Illustrative commands, not currently shipping.** Define discoverable typed JSON schemas, capability/version negotiation, bounded pagination, job IDs, progress and resumable journal, freshness indicators, reasons/citations for identity assertions, permissions and user-approval gates. Do not expose raw cloud credentials in model prompts. Offer MCP and Python bindings generated from the same contract. Version provider adapters for Cloudflare R2, Google Drive, Dropbox, OneDrive, local filesystem and later ~20 priority widely used providers; adding an adapter ordinarily must not rewrite Universal API, Resource Atlas, journal, coordinator or GUI. Evaluate rclone as an optional interoperable transport/backend, not REDOWN's identity engine.

## 6. LLM interchangeability + memory independent of models
- Plug in supported Hugging Face model repositories (with format/runtime/license validation), local model files (e.g. GGUF) and Ollama/llama.cpp or hosted endpoints via adapter contracts; “any LLM” means extensible supported runtimes, not magical binary compatibility.
- Offer an optional default REDOWN-tuned compact model, benchmark before selecting/fine-tuning. Collect instruction -> tool-schema -> validation/outcome examples; never train on private files without opt-in. The native engine performs indexing, comparison and file operations; models translate intent and explain options.
- LangChain/LangGraph memory adapters are optional; REDOWN's durable object memory, verified history and user preferences remain runtime/model-independent and exportable. Separate system evidence from model-generated memories. No inference output may override verified events.
- Agent execution uses least-privilege scopes, quotas, prompt-injection isolation from filenames/file contents, dry-runs for write operations and explicit authorization for deletion/reclamation.

## 7. Commercial strategy and economic boundaries
- Aspirational **$5/month REDOWN Pro**, with essential search, documented CLI/API, restore and portability not hostage to paid access; differentiate paid tier via polished UX, optional advanced orchestration/visual intelligence, management tools and support. Define limits only after measured costs.
- Recommend Cloudflare R2 as a practical user-owned archive destination where suitable; show current region/account-specific prices (storage, requests, retrieval/egress and any relevant fees), retention choices, data-transfer strategy and alternatives. REDOWN should not silently foot unlimited cloud storage, bandwidth, AI inference or processing charges.
- Product differentiator is not “rclone with previews.” It is *persistent proprietary identity correlation + universal file memory + trustworthy visual history + exact deduplicated restoration + open agent access*. No unverified superlatives or unsupported claims.

## 8. Acceptance and adversarial benchmarks
1. Seed >=40,000 files across local + four R2 buckets, then at least one additional independent provider; preserve a reproducible fixture corpus with 5 distinct verified real samples per format where available, report all gaps and licenses. Existing collector results are sample acquisition, **not** format/preview certification.
2. Tests: identical content under different names; different content under same name; duplicate source vs same semantic object; large/small files; Unicode long names; path collisions; moves/renames (including across volumes/clouds); provider disconnection, eventual consistency and unavailable permissions; partial failures.
3. Snapshot 400 GB logical workload with measured actual unique bytes and restore **all original paths** while validating content. Demonstrate with synthetic duplicate-heavy and duplicate-light corpora, not promised savings.
4. Simulate deleted folder, disconnected cloud, overwritten version and ransomware-like delete; show historic view, distinguish metadata-only from recoverable content, restore to new volume, verify hashes and report anything unrecoverable.
5. Benchmark interactive response p50/p95/p99, warm/cold 40k search, 100-file idle batches with CPU/RAM/battery/IO budgets, index reconciliation accuracy, cost per GB, transfer parity and fault recovery vs defined rclone baselines.
6. Evaluate local small model vs hosted model on natural-language -> typed tool selection, vague memory retrieval and permission compliance, with and without cached index, logging and grounded explanations.
7. Export identity ledger, history, virtual names, manifests and backup data; successfully restore with a standalone independent reader when REDOWN is not installed.
8. Pass AAC/AOB acceptance using unfamiliar agents and reproducible evidence; Forever Works documents purpose, contracts, failure modes, migration invariants and replacement obligations.

## 9. Implementation sequence
**P0:** Formal identity/ledger/schema/portability contracts, privacy threat model and backup safety invariants.  
**P1:** Metadata-only native Resource Atlas, virtual long names, local watching, cross-scope history, CLI/API, reliable 40k search.  
**P2:** Cloud adapters, change detection, verified exact-byte duplication, snapshots, manifests, deduplicated user-owned R2 backup and independent restore utility.  
**P3:** Historical GUI/time machine, visual fingerprints and semantic search, dynamic media previews, portable LLM runtime adapters, model-independent knowledge/memory.  
**P4:** Native default model fine-tuning, robust background scheduling, more providers, aggressive reliability/performance testing and commercially measured $5 offering.

### Architectural invariants
1. External API usability does **not** imply disclosure of proprietary REDOWN identity mechanics.
2. Identity, original names, history, backup manifests and user data remain portable even if REDOWN is unavailable.
3. No provider, LLM, language or model runtime is architecturally indispensable.
4. Never promise recoverability without independently verified bytes and valid decryption access.
5. Never destructive-clean up before proof + explicit authorization.
6. Never silently expose private content to hosted models or remote analysis.
7. All implementations must survive cold-agent inheritance under Forever Works, with versioned, agent-discoverable contracts.

**Request:** Treat this as a cross-phase founding architectural proposal for review and follow-on implementation plans, not an assertion that these features currently exist.