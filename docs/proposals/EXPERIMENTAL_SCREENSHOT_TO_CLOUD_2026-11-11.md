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
- Where supported and explicitly configured, organize corresponding cloud objects under a **single subfolder/prefix per page group**. Otherwise implement *logical grouping* in the app's local index without claiming the provider itself has grouped files.
- For cloud-side group names, use a neutral title or local generated group label; sanitize names and handle collisions. **Do not send original webpage/source URLs in cloud object metadata, filenames or folder names.** Source page identity stays in local/private application indexing; the provider receives screenshot bytes and necessary object names/paths only.
- Make group handling compatible with multi-provider saving: the same logical group can have distinct verified file locations and partial completion states across providers.
- Allow grouping to be toggled without changing or deleting existing uploaded screenshots; offer a view filter for grouped vs individual items. Never silently move existing cloud files when changing the grouping setting.
- Page identity should be linked to the user-initiated capture intent, not inferred later from uploaded screenshots.

## Capture, security, and architecture

- The default capture mode is the visible active browser tab; explore selected-area and full-page capture later. Screenshots are not replacements for the original full-resolution images.
- Make capture scope and limitations explicit. Require necessary browser permissions; never run covert monitoring. Handle restricted tabs and sensitive content safely.
- One API-first capture-and-save workflow serves manual shortcut, toolbar, and automatic trigger. Record independent stages: **CAPTURE_REQUESTED → CAPTURED → QUEUED → UPLOADING → VERIFIED**, with clear errors and recoverable states.
- Reuse provider readiness checks, targeted OAuth repair, queue, History, GO TO receipts, logging and debug mode. Preserve pending work only with a clear retention and quota policy.
- Ensure idempotency on retry or menu events: one capture per original user intent, no duplicate objects in cloud.
- Provider upload carries screenshot bytes and required filename/path only. The source webpage URL and unrelated browsing details must not become provider object metadata.
- Explicitly distinguish browser-captured screenshot bytes from TRUE REMOTE URL-to-Cloudflare fetching; never perform an implicit browser Downloads save.
- Give screenshots readable timestamped names, clearly identified as screenshots, and implement filename/group collision handling.

## Acceptance tests

- Shortcut and automatic mode; automatic OFF does nothing; ON captures exactly once per image-save attempt.
- One/all selected providers and mixed success/failure; original image blocked but screenshot succeeds and reverse.
- Same-page series of ten screenshots is grouped as one collection, including across sessions; different hosting pages stay separate.
- Cloud folder/prefix grouping only when configured and supported; local grouping otherwise. Toggle grouping without moving/deleting uploaded files.
- Expired auth, missing scopes, unavailable provider, denied capture permission, restricted page, retries, restart, and duplicate prevention.
- Per-provider receipt and History GO TO only after verified cloud write. Group status accurately represents incomplete uploads.

**Priority:** Future experimental design, not a shipped feature or authorization to activate it.
