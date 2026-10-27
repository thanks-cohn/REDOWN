# Issue 42: draggable sticky and Test It Tools

October 27, 2026. Base: 4a4328c3b466d8d4aa7a497a0fbd8731355e8d8b. Branch: beta-explorer.

Test It opts into a six-dot grip on the existing guide. Pointer capture preserves the initial pointer offset; only the grip handles movement. Arrow keys move 10 pixels, Shift + arrow moves one pixel. Manual position survives exercise transitions and is clamped on viewport resize. The existing Tour does not opt in and its module is unchanged.

A fixed bottom-right Test It Tools button opens the existing three action buttons upward. Their IDs and action handlers are retained. Outside click, focus leaving, Escape, toggle, arrows, Home/End and Tab are handled without modifying session state. Main content reserves bottom space for the launcher. The menu is height bounded and scrollable on small windows. The export exercise's presentation target now points at the new launcher; all 60 definitions, export implementation, cleanup handler and practice safety policy are unchanged.

## Verification

- Targeted DOM/in-memory provider suite: 83 tests passed (beta-explorer, test-it-session, test-it-tools).
- After final focus/layout adjustments: three tools tests and the integrated 60-exercise/progress test passed again.
- Full npm test: 458 tests, 448 pass, 10 fail, no skips. Unchanged base independently run: 455 tests, 445 pass, the same 10 failing test names. No extra failing tests introduced.
- npm run check and explicit node --check of new module: passed. git diff --check: passed.
- npm run reliability:check: not green. Syntax, API registry and issue inventory pass; architecture source freshness remains failed for existing Legacy options/background references. Frozen evidence was not rewritten.
- Installed Chrome smoke: blocked with CHROME_NOT_AVAILABLE_ENOENT. No Chrome/Chromium executable is available. No installed GUI, rendered responsive layout, actual pointer capture, real download or live cloud mutation is claimed.

The automated suite exercises real UI handlers with jsdom and in-memory provider fixtures, including all 60 exercises, menu progress preservation, drag offset, step retention, resizing, keyboard movement, unique controls, action dispatch, Tour behavior, export-state and copy-only protection. Installed-extension mouse/keyboard/responsive acceptance, exported download and authorized-copy cleanup remain manual acceptance items. Issue 42 remains open for that verification.

## Changed files

- extension/beta/explorer.html: relocate three existing buttons; add launcher/menu.
- extension/beta/explorer.css: grip, launcher and bounded drop-up styling.
- extension/beta/explorer.mjs: install menu and exclude it from Explorer shortcuts.
- extension/beta/guided-interaction.mjs: optional grip and retained/clamped position.
- extension/beta/test-it.mjs: enable grip and point export highlight at launcher.
- extension/beta/test-it-tools.mjs: menu presentation/focus only.
- tests/beta-explorer.test.mjs: wire imported menu into DOM harness; assert progress preservation.
- tests/test-it-tools.test.mjs: focused interaction checks.
- This report.
