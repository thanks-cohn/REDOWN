# Explorer Audit: Invisible Upload Folder and Unwanted Per-Folder Plus Controls

**Date:** 2026-10-30
**Branch:** `release/cloudflare-true-remote`
**Audited baseline:** `7f3f22f26de5bd0862ad5605c48a7f4b002c3bf9`

## Findings

### 1. Upload Folder appeared invisible because of a CSS cascade error

The top-right `Upload files` button uses `class="primary"` outside the Explorer `.actions` container.
The new `Upload folder` button was correctly placed beside More, also with `class="primary"`, **inside** `.actions`.

The older generic rule `.actions button { background:transparent }` has greater specificity than the theme's `.primary { background:var(--accent);color:var(--bg) }`. As a result, Upload Folder lost its accent-colored background while retaining its text color, making it nearly invisible on themes with a similar panel and text/background color. This is a real source-level selector conflict; real Chrome rendering was not captured.

**Repair:** `.actions #upload-folder.primary` now restores the theme's `--accent` background and an appropriately matched hover background while inheriting primary button typography and theme-specific foreground, border, and neon refinements. It does not alter the Upload files button or its click handler.

### 2. File Explorer incorrectly showed + on every folder

The `render()` function in `extension/beta/explorer.mjs` previously added `.folder-add` to every folder row unconditionally. This was a scope error: **inline + creation was required in Right-click destination setup, not as the default file-list affordance**.

The top toolbar already had a New folder button, but `actions.mkdir` had been changed to show a separate inline form. The prior familiar New folder dialog had been replaced.

**Repair:**
- Default: existing top toolbar **New folder** command opens its familiar name-entry dialog and creates the folder in the current bucket/prefix.
- Folder-row + controls are **hidden by default** and appear only if the user enables **Explorer preferences → Explorer folder controls → Show inline + buttons on folders**.
- This preference is persisted in Chrome extension-local storage as `betaExplorerInlineFolderButtons` and responds to cross-window storage changes.
- Existing opt-in + controls continue using the existing inline create form and validated folder API. Disabling the option hides them.
- This is independent of `extension/beta/destinations.js` and `extension/nested-menu-editor.js`. **Inline + in Right-click setup remains available** and unchanged.
- The existing top New folder button remains the primary Explorer affordance and next to Keep Both; it has no decorative + in its label.

## Source changes

- `extension/beta/explorer.css`: Specificity fix for themed Upload Folder background and hover.
- `extension/beta/explorer.html`: Plain New folder label; opt-in Preferences checkbox and clear scope explanation.
- `extension/beta/explorer.mjs`: Persisted default-off per-folder + flag; restore top-toolbar dialog action; keep existing folder API and keyboard path; render appropriately after settings changes.
- `tests/beta-explorer.test.mjs`: Update folder-operation tests to the default top-toolbar workflow; regression coverage for setting opt-in, inline error handling, original parent path, and themed Upload Folder CSS source selectors.

## Verification performed

- Read the relevant release-branch files and root cause selectors.
- Verified current source parses as JavaScript, HTML IDs are unique, toolbar adjacency remains unchanged, and the new setting is only used by the File Explorer.
- Updated automated regression cases, but **did not execute the complete Node/jsdom test suite**.
- **Not verified in a running Chrome extension:** actual computed contrast across every theme; click-driven folder creation against real R2; preference persistence across installed browser windows.

## Acceptance checklist for browser testing

1. Default light and dark themes: Upload Folder is visibly filled and has legible text in normal, hover, focus and disabled states.
2. Upload Folder stays immediately right of More and opens the folder picker.
3. The top New folder command remains immediately left of Keep Both and opens the normal creation dialog.
4. File Explorer folders have **no default + controls**; Right-click setup **does** retain its inline + controls.
5. Turning on the explicit setting shows folder-row + buttons; turning it off hides them. The value persists after reload/restart.
6. Existing directory creation, cancellation, duplicate-name handling, keyboard shortcuts, and nested destination creation remain working.

This audit deliberately does not alter right-click routing, background Worker provisioning, archive reader, or unrelated features.
