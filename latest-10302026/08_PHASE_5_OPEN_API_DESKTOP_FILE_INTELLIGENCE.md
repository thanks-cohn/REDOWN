# IMPORTANT | FUTURE PHASE 5: REDOWN Open API, Desktop Companion & File Intelligence

**Status:** PROPOSAL ONLY; no code, model training, or public API is created by this document.
**Date:** October 30, 2026
**Branch:** `release/cloudflare-true-remote`
**Strategic direction:** From a right-click remote downloader and Explorer into a **programmable, private-by-default file workspace** spanning extension, native desktop and optional cloud services.

## Core concept: one file workspace, multiple clients

REDOWN should let a user inspect, read, annotate, tag, classify, search, process and safely organize files, whether they are in R2 or in a specifically user-authorized local directory. The UI can be Chrome's extension and Shelf, the modern Explorer, a native desktop client, or a permitted third-party program calling a **future, explicitly authorized API**. They should share the same versioned file identity and metadata model.

**Do not conflate the current internal application API with an already-public developer API.** Exposing it externally requires new authorization, a stable contract, permissions and test coverage. The Chrome extension must remain fully useful when the desktop app is not installed.

## 1. What users should be able to do

1. **Tag anything:** manual tags; imported tags from folder ancestry; multiple tag namespaces; batch tagging by file, selection or directory; autocomplete and search.
2. **Annotate anything:** notes, comments, ratings, bookmarks and image regions; PDF page coordinates, highlights and text anchors; video timestamps/time ranges; audio timestamps; comic page identifiers and archive-entry paths. Maintain original data unchanged by default.
3. **Ask models to propose organization:** object recognition, scene detection, OCR, semantic text indexing, duplicate detection and similarity clustering; show confidence and provenance, require user review before move/rename/delete.
4. **Use local or chosen remote models:** run inference through an authorized desktop companion's CPU/GPU or opt in to a selected private cloud processing pipeline. No automatic upload to model providers.
5. **Train or fine-tune authorized models:** choose datasets from specifically selected files; inspect inclusion, labels and permissions; export datasets/model metadata; save checkpoints where supported. Do not automatically train on personal files.
6. **Search across content and metadata:** filename/path, tags, notes, OCR text, document text, semantic results, image similarity and annotations; scope by authorized bucket, account and directory.
7. **Automate repeatable jobs:** watch authorized folders for new items, queue tagging/conversion tasks, preview changes, execute approved plans, export an audit trail and recover interrupted tasks.
8. **Keep reading experience unified:** Phase 1 Scrolldown, Phase 2 Pretty, Phase 3 directory Reader/Magazine and Phase 4 ExtremeScale should all consume the same rich file metadata and annotations.

## 2. Native desktop + extension

**Proposed bridge:** Chrome's documented **Native Messaging** capability can connect an installed and registered desktop companion to an extension. It requires the appropriate `nativeMessaging` permission and host registration. Use the extension service worker for requests, never trust content-script payloads. The desktop app is an **optional companion**, not a prerequisite for REDOWN's current remote downloads.

Possible responsibilities of the native companion:
- Browse **explicitly authorized** local folders and provider-mounted paths, preserving user intent and access permissions.
- Process larger files and run background jobs that are ill-suited for browser-service-worker lifecycles.
- Offer CPU/GPU-assisted PDF/image rendering, OCR, object/face recognition where enabled, video thumbnails and speech transcription where approved.
- Build private local indices, embedding stores or thumbnail caches under bounded storage budgets.
- Handle long-lived high-volume batch transfers and resumable upload/download where supported.
- Provide local model management and documented hardware-resource limits.

**Pairing and safety:** Desktop app installation and connection require user choice, explicit allowed extension ID, secure protocol negotiation, capability scopes, message validation, per-directory authorization and a visible disconnect/revoke control. Native Messaging host registration is not by itself an adequate defense against all locally malicious applications; define additional application-level safeguards as appropriate. Do not create a generic localhost command shell or expose privileged endpoints to arbitrary websites.

Reference: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

## 3. Proposed public API (future, not yet exposed)

Define one versioned service contract behind transport-neutral request handlers. Possible high-level endpoints or SDK operations:

```text
files.list(scope, cursor, filter)
files.getMetadata(fileId, version)
files.readRange(fileId, offset, length)
tags.list(fileId)
tags.add(fileId, tags, provenance)
tags.remove(fileId, tags)
annotations.list(fileId)
annotations.add(fileId, anchor, body)
annotations.update(annotationId, revision, patch)
collections.search(query, scopes)
models.listAvailable()
models.infer(modelId, fileIds, options)
models.prepareDataset(fileIds, labelScheme)          # explicit review
models.trainApproved(datasetId, computeBudget)       # explicit authorization
organization.propose(fileIds, policy)
organization.preview(planId)
organization.applyApproved(planId, verification)     # gated mutation
jobs.get(jobId)
jobs.cancelRemaining(jobId)
export.portableMetadata(scope, formatVersion)
```

These are names for a **design proposal**, not implemented operations. Support paged lists and long-running job handles rather than a synchronous multi-hour API request. Assign stable request IDs, idempotency keys for safe retry types, statuses such as queued/running/completed/partial/failed/cancelled/uncertain, and versioned result envelopes.

**Scopes:** distinct `files:read-metadata`, `files:read-content`, `tags:write`, `annotations:write`, `models:infer`, `models:train`, `organize:propose`, `files:move`, `files:delete`, `transfers:write`. Permissions must additionally constrain account, bucket and local directory roots. A read-only plugin must never inherit transfer/delete permissions just because the extension has them.

For external API access, plan user-authorized identity, revocable app tokens or suitable OAuth flows, rate limits, permission prompts, expiry/rotation and audit logs. No permissive wildcard external messaging or automatic public bucket access.

## 4. Portable metadata, annotation format and provenance

- **Keep originals immutable by default.** Annotations and model outputs should live in an independently versioned metadata sidecar/index, not automatically rewrite PDFs, images or ZIP archives.
- Stable identity: `{provider, accountId, bucket, objectKey, objectVersionOrETag}` for R2; for authorized local files use an equivalent scoped identity with filesystem re-scan/reconciliation.
- Store tag value, namespace, label provenance (`manual` / `folder-derived` / `model-generated`), confidence where meaningful, model ID/version, timestamp and review state.
- Store annotation anchors specific to media: page number + normalized rect/text anchor for PDFs; image crop/shape regions; video/audio time; archive key + inner page path. Handle changed source versions without silently attaching notes to wrong content.
- Offer export/import of human-readable, machine-readable versioned JSON, linked to REDOWN's existing durable transfer-history format concept. Enable migration between extension/native app, and disclose private URLs or embedded snippets before exporting.
- Reconcile conflicts using revisions; never overwrite another device's manual tags or annotations merely because a model produced an alternative.

## 5. User-facing workflow example

1. The user authorizes one local project folder and one private R2 bucket.
2. The extension shows files and their existing folder-derived tags.
3. The user chooses **Analyze selected files**, picks a local model and reviews estimated compute requirements.
4. The desktop companion scans only selected files and returns proposed object tags, document OCR terms, duplicate groups and confidence/provenance.
5. REDOWN presents changes as **suggestions**: "Apply these tags", "Create a virtual collection", "Propose moving these files".
6. The user approves a plan. Writes and transfers use existing verified operations; deletion/source removal is never implied by metadata classification.
7. Metadata and reading state can be opened from the extension, desktop app and authorized future developer API.
8. Optional training requires a separate opt-in dataset-review flow and explicit storage/compute policy.

## 6. Machine learning strategy and limits

- Prefer **inference first**, because useful tagging, OCR, semantic indexing and smart organization do not necessarily require expensive retraining.
- Training/fine-tuning is a **later, optional power-user feature**. Keep it separate from ordinary tagging, and do not promise every model supports training. Respect data licensing, original source provenance, compute budgets and any consent required for sensitive inputs.
- Support opt-in model pipelines with separate outputs, reproducible configuration and no implicit merge that destroys model-specific attribution.
- Local-first model execution is valuable but optional: capability varies dramatically by hardware. A less capable machine should still work with manual tags, optional remote inference or no ML at all.
- For sensitive face/person metadata, disable by default and require explicit, specific consent, local processing preference and careful review controls.
- Never train an external provider's model on a user's files unless the user explicitly opts in to the specific transfer/use.

## 7. Build order and product constraints

1. Formalize portable file IDs + metadata model + export.
2. Implement manual tags, folder-derived tags and portable annotations.
3. Add safe search/indexing and non-destructive organization *proposals*.
4. Build an optional native desktop companion with Native Messaging pairing and local folder permissions.
5. Add local inference adapters, OCR and reproducible model provenance.
6. Publish a restricted, documented external API/SDK with capability scopes and rate controls.
7. Add optional user-approved training, dataset export and advanced automation only after privacy and compute safeguards mature.

**Compatibility:** Preserve existing REDOWN right-click remote downloads, Shelf, modern Explorer, legacy archive abilities, source URL history, default Keep Both conflict policy, selected visual themes and private-by-default publishing.

## Acceptance criteria

- An unconnected desktop companion never blocks browser-only operations.
- User-approved local folder scopes are enforced; forbidden folders cannot be scanned via API.
- A model's proposed tags/organization are inspectable and reversible; unapproved moves and deletions never happen.
- Tag/annotation export round-trips with stable IDs and model provenance and does not mutate original file bytes.
- Training cannot begin just by opening a file or selecting a folder; it requires a reviewed dataset and explicit authorization.
- Replaced cloud objects do not inadvertently inherit stale annotations without reattachment/reconciliation.
- API callers cannot escalate from read-only to write/delete permissions; revoked credentials cease to work.
- Native-host payloads are strictly validated, with safe cancellation and bounded job execution.
- The same document and media rendering capabilities work regardless of whether the source is browser-only cloud storage or an explicitly authorized local desktop folder.

**Thesis:** REDOWN becomes an **interface to a user's own files**, rather than forcing those files into a specific vendor's suite. Machine intelligence is an optional layer the user controls.
