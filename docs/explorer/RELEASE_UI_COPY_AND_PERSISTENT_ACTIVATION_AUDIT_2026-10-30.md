# REDOWN release UI audit: persistent Activate Buckets and customer-facing language

**Date:** 2026-10-30  
**Branch:** `release/cloudflare-true-remote`  
**Scope:** Explorer controls, first-use setup disclosure, right-click configuration feedback, footer, progress messaging. This is a focused UI and behavioral repair, not a full audit of every package in the repository.

## Findings

1. **Activate Buckets disappeared when ready or not yet checked.** `paintActivation()` set `action.hidden` based on activation state, despite the requirement that the button remain visible immediately to the right of Grid View. Its CSS still targeted `.toolbar #prepare` after the control was moved under `.actions`.
2. **“Layout updated in Chrome” came from the current destination editor.** It was a literal success/status string in `extension/beta/destinations.js`. The phrase did not establish any copied Codex artifacts. The native Chrome context-menu API remains necessary for the extension; it need not be advertised in ordinary feedback.
3. **The first-run dedicated REDOWN bucket disclosure was expanded automatically.** `destination-first-setup` had the HTML `open` attribute and was auto-expanded by the destination editor when it had no eligible prepared profiles, even if the user already had existing R2 buckets. The optional setup can create or reuse a *new dedicated* bucket named `redown`. This must not appear to be a required action.
4. **A stale limitation was permanently displayed.** “Folder downloads and durable transfer recovery are not available yet” appeared at all times under the progress indicator, even when the user was performing unrelated tasks. Unsupported actions must instead explain their actual limits at the time they are invoked.
5. **Footer copy was cramped.** The file-count and keyboard-hint spans were adjacent in a nonwrapping narrow layout; the footer needed stable gap and wrap rules. The count and connected-account label are live product data, not evidence of development tooling.

## Implementation

- `extension/beta/explorer.mjs`: activation button is never hidden, including idle, ready, unknown, signed-out, and no-bucket states; no-bucket click points to Storage Buckets, already-ready click doesn't re-provision, unknown state verifies first. Updated refresh/download/menu warning status strings to product language.
- `extension/beta/explorer.html`: removed initial `hidden` from Activate Buckets, preserved adjacency to Grid View. Collapsed optional dedicated bucket setup by default, clarified that existing buckets can be used, and removed permanent feature-limitation banner. Footer shortcut region has a separate styling class.
- `extension/beta/explorer.css`: activation styling now targets actual `.actions` placement, with explicit unselected, idle, ready, and needed states. Footer wraps with useful gap at narrow widths.
- `extension/beta/destinations.js`: mode and save status messages describe the REDOWN right-click menu, rather than showing technical “Chrome” copy. Removed automatic first-use expansion. The section may still be opened by the user or a specific unmet setup action.
- `extension/beta/quick-links.js`: optional dedicated-bucket setup accurately says it may prepare the dedicated bucket, and still requires confirmation before a new resource is created.
- `tests/beta-explorer.test.mjs`: regression tests for persistent Activate Buckets placement/state, unselected behavior, action-scoped CSS, release UI copy and optional disclosure.
- `tests/modern-destinations.test.mjs`: update status assertions and test that setup remains collapsed until requested, and that menu-mode feedback is product-facing.

## Safety and scope

The extension must still use the browser's `chrome.contextMenus` API internally. Replacing its visible success messages does not remove or bypass this functional API.

Existing real Cloudflare account names, bucket names, and file counts remain intact. The ordinary Explorer's internal practice/test controls are hidden by default in source; their implementation modules still exist for development and testing. This change does not claim to remove all internal QA code from the extension bundle.

The folder-download API still rejects unsupported folder downloads. Removing a perpetual warning does **not** implement folder download; an explicit attempted download must still fail truthfully.

No Cloudflare bucket, object, Worker, account connection, or right-click destination was changed by this task.

## Verification performed

- Fetched and inspected the release-branch HTML, CSS, Explorer, destinations, and quick-links scripts.
- Confirmed JavaScript and test-source syntax for modified scripts via direct parsing.
- Inspected rendered-source contracts: no duplicate HTML IDs; Activate Buckets initially visible and adjacent to Grid View; no old permanent limitation text; optional dedicated bucket disclosure collapsed; no old “Layout updated in Chrome” message; state-aware activation CSS selectors target the current container.
- Added and revised unit/jsdom regression tests, but **did not execute the full Node test suite or verify computed styles in a live installed Chrome extension**.

## Manual acceptance

1. Load/reload REDOWN in Chrome. Activate Buckets remains shown next to Grid View before any bucket is selected.
2. Click Activate Buckets with no bucket selected: it explains that a bucket must be chosen, without any Cloudflare mutation.
3. Select an already-ready bucket: the button remains visible with ready status and does not redeploy its Worker.
4. Select an inactive bucket: the button explains readiness, then requires the established explicit confirmation before activation.
5. Switch Simple/Nested and save: feedback says REDOWN right-click layout/menu was updated, not an unexplained “Layout updated in Chrome.”
6. With existing storage, optional dedicated-bucket setup stays collapsed; opening it explicitly explains it can create/reuse the separate `redown` bucket.
7. Footer file count and keyboard hints remain separated at narrow widths. Permanent limitation warning does not appear. Attempts to download an unsupported folder still display an accurate operation-specific error.

**Follow-up:** run the complete Node/jsdom suite and extension-in-Chrome verification, and separately decide whether internal Test It modules should be excluded entirely from production packaging rather than merely hidden from ordinary UI.
