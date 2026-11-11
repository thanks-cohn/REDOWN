# Experimental Feature — Screenshot to Cloud

**Proposed:** 2026-11-11  
**Products:** Click2Cloud and REDOWN  
**Status:** Product direction / experimental; not implemented.

## Core idea

**Screenshot to Cloud** supports two user-controlled triggers:

1. **Manual browser shortcut:** A configurable keyboard shortcut or toolbar action captures a screenshot and uploads it to one, several, or all selected cloud providers.
2. **Automatic right-click companion:** If enabled in Settings, attempting to save an image via Click2Cloud/REDOWN right-click automatically captures an additional screenshot and sends it to the selected cloud providers. Trigger once per actual save attempt, not simply on context-menu opening.

## Provider selection and destination

- Independently select Cloudflare R2, Google Drive, Dropbox, OneDrive (subject to each being actually connected and able to save); include **Select All** and **Clear All**.
- User may send screenshots to **all** providers, regardless of which provider was selected for the original right-click image save.
- Resolve each provider's Default Location unless a dedicated screenshot destination is configured.
- Report verified results per provider. Partial success is possible, and screenshot success never means the original image saved successfully.

## Optional same-page screenshot grouping

Add a Settings option: **Group screenshots by source page** (ON/OFF; user-controlled). It applies to both manual and automatic screenshots.

- Ten screenshots taken from the **same hosting webpage** should be browsable as **one screenshot group/collection**, yet each screenshot remains individually viewable, downloadable, renameable, and manageable.
- Group by a privacy-preserving **canonical page identity**, not by image CDN/source-file URL. Different image URLs on one webpage belong to the same page group. Define rules for query parameters, fragments, redirects, same-page navigation, and cross-session persistence.
- Display an expandable group in REDOWN/Click2Cloud History with screenshot count, thumbnails, latest capture time, and linked upload status per provider. Keep chronological order inside.
- **Preferred design: naming convention + existing page information + REDOWN UI.** Use a stable screenshot filename convention (for example `Screenshot_<page-group-token>_<YYYYMMDD-HHMMSS>_<sequence>.png`), and associate the capture with the source/hosting-page data already recorded in the application's private History/intent index. Do not invent a second page-discovery pipeline.
- Group primarily in the **REDOWN / Click2Cloud UX/UI**: display a single expandable collection based on known source-page identity, without requiring any physical grouping or moving files in cloud storage. The files remain ordinary individual objects in their existing provider destinations.
- Filename nomenclature is a lightweight recognizability/recovery aid, **not** the sole authoritative grouping key: maintain a stable local group identifier derived from the existing source-page information so renames do not break grouping. Sanitize names and avoid collisions.
- **Do not send original webpage/source URLs in provider object metadata, filenames or folder names.** Keep source-page identity in the application's local/private index; the provider receives screenshot bytes and the necessary filename/path only. A short opaque page-group token in a filename is allowed if it does not reveal the URL.
- Cloud-side folder/prefix grouping is **not required or the default**. If ever offered, treat it as a separate opt-in enhancement, never as the prerequisite for the History presentation.
- Make group handling compatible with multi-provider saving: the same logical group can have distinct verified file locations and partial completion states across providers.
- Allow grouping to be toggled without changing or deleting existing uploaded screenshots; offer a view filter for grouped vs individual items. Never silently move existing cloud files when changing the grouping setting.
- Page identity should be linked to the user-initiated capture intent, not inferred later from uploaded screenshots.

## Optional Cloudflare R2 metadata for portable grouping

**Owner extension (2026-11-11):** Cloudflare R2 may carry the screenshot's **hosting-page URL as object custom metadata** so REDOWN can rebuild screenshot groups later by reading cloud objects, even if its local History index is lost. This is an *opt-in exception* to the default rule against sending page/source URLs to providers; it does not change the default for R2 or any other provider.

- Settings: **Store source page URL in Cloudflare R2 metadata for screenshot grouping** — OFF by default, with plain-language disclosure that URLs may contain private paths, searches, account IDs or access tokens and that cloud metadata is not inherently private from the storage provider or people with bucket access.
- In the enabled mode, set an explicitly namespaced user-defined R2 object metadata key (e.g. `redown-source-page-url`) containing the **hosting page URL** of the screenshot, not the media/CDN URL. Never attach this key to unrelated objects. Follow R2 metadata size and character constraints and validate successful write/read-back.
- For safer operation, strip credentials, fragments and sensitive query parameters by default; allow an origin-only mode (`https://example.com`) for less exact grouping. If sanitization changes identity, show the possible grouping limitations. Avoid storing secrets from signed URLs or private pages.
- Also store an opaque stable grouping token (e.g. `redown-page-group-id`), screenshot intent ID, and capture time where supported. Tokens are preferred for comparisons and prevent relying on URL text equality alone. Ensure these values agree with the app's local index.
- On History rebuild / cloud restore: list permitted R2 objects, read their metadata, reconstruct page-group entries and associate each with its own provider receipt/key; tolerate objects lacking metadata and account/bucket permission failures. Do not infer successful cloud writes from a filename alone.
- Maintain local-only grouping when this option is OFF, the provider is not Cloudflare R2, or the object metadata cannot be read. Never backfill or rewrite existing cloud objects merely from toggling the option; require a separate user-approved migration.
- Keep the original object-byte + filename privacy rule for all other providers, and for R2 unless the user has explicitly enabled this feature.

## Capture, security, and architecture

- The default capture mode is the visible active browser tab; explore selected-area and full-page capture later. Screenshots are not replacements for the original full-resolution images.
- Make capture scope and limitations explicit. Require necessary browser permissions; never run covert monitoring. Handle restricted tabs and sensitive content safely.
- One API-first capture-and-save workflow serves manual shortcut, toolbar, and automatic trigger. Record independent stages: **CAPTURE_REQUESTED → CAPTURED → QUEUED → UPLOADING → VERIFIED**, with clear errors and recoverable states.
- Reuse provider readiness checks, targeted OAuth repair, queue, History, GO TO receipts, logging and debug mode. Preserve pending work only with a clear retention and quota policy.
- Ensure idempotency on retry or menu events: one capture per original user intent, no duplicate objects in cloud.
- By default, provider upload carries screenshot bytes and required filename/path only. The source webpage URL must not become provider metadata **except under the separately enabled Cloudflare R2 screenshot-metadata option documented above**.
- Explicitly distinguish browser-captured screenshot bytes from TRUE REMOTE URL-to-Cloudflare fetching; never perform an implicit browser Downloads save.
- Give screenshots readable timestamped names, clearly identified as screenshots, and implement filename/group collision handling.

## Acceptance tests

- Shortcut and automatic mode; automatic OFF does nothing; ON captures exactly once per image-save attempt.
- One/all selected providers and mixed success/failure; original image blocked but screenshot succeeds and reverse.
- Same-page series of ten screenshots is grouped as one collection, including across sessions; different hosting pages stay separate.
- Existing source-page metadata and screenshot filename convention produce an expandable REDOWN UX/UI collection without creating cloud folders. Renamed screenshots remain grouped; toggle grouping without moving/deleting uploaded files. With explicit R2 metadata opt-in, reconstruct groups after loss of local indexing.
- Expired auth, missing scopes, unavailable provider, denied capture permission, restricted page, retries, restart, and duplicate prevention.
- Per-provider receipt and History GO TO only after verified cloud write. Group status accurately represents incomplete uploads.

**Priority:** Future experimental design, not a shipped feature or authorization to activate it.
