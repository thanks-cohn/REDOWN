# P0 V3 RIGHT-CLICK REPAIR — EMPTY CHROME MENU AND UNWANTED SAVED-URL COMMAND

**Date:** 2026-10-30  
**Branch:** `codex/v3-parity-first-reconstruction`  
**Scope:** Right-click only. No Explorer, transfer, provider or existing URL UI rewrite.  
**Owner's observed regression:** Added and saved a V3 destination, but the REDOWN Chrome right-click menu did not show the destination. Chrome's right-click menu also displayed the unwanted action “View saved object's URLs…”.

## Required outcome

1. When V3 is selected in Settings and a valid enabled V3 destination is saved, Chrome's REDOWN context menu shows that destination under the appropriate context (link/page/image etc.) and choosing it routes to the exact stored folder via existing transport.
2. Saving while Legacy is selected must clearly say **V3 is saved but inactive**, show the current engine and offer an unambiguous way to activate V3 using the existing Settings selector. It must never claim the V3 destination has been installed in Chrome while Legacy owns the menu.
3. Engine selection is persistent; switching to V3 triggers deterministic registration and report of *actual* Chrome `contextMenus.create` callback results. Failures must expose actionable errors. Restart and extension reload must regenerate the correct active menu. Verify real Chrome behavior, not only a mocked menu plan.
4. **Remove “View saved object's URLs…” entirely from Chrome's REDOWN context menu for BOTH engines.** Preserve the existing URL system and its URL UI, Get URL flows, public-access consent, and stored state. Remove/retire the menu-only handler as appropriate without deleting functionality in the actual URL panel.
5. Remove stale or duplicate entries during rebuild, handle parent/child menu registration order and failures, and avoid claiming Save success means Chrome installation success. Do not add a second setup UI, resurrect old setup files, or change unrelated Explorer modules.

## Source anchors and initial hypotheses to verify, not presume

- `extension/background.js`: `v3MenuTransaction` saves `rightClickV3` while `rightClickEngine` remains Legacy by default. `buildMenus` draws only the selected engine's entries. Therefore V3 save alone does **not** cause V3 destinations to appear; the user must select V3 in Settings. Confirm actual stored value and user-visible status.
- `extension/beta/right-click-v3-ui.js`: the note says Legacy remains active, but the workflow may be insufficiently obvious. Clarify active/inactive and registration status.
- `extension/background.js`: `addMenuControls` explicitly creates `id:'redown-saved-urls'` / title `View saved object's URLs…`. Remove this menu item in both modes, leaving the URL system alone.
- `extension/background.js`: `buildMenus` uses `contextMenus.removeAll` then sequential `create` and clears the menu again on failure. Diagnose why registration might fail in a real extension; avoid assuming saved config implies a registered menu.
- `extension/right-click-v3.js`: `entries()` validates readiness and computes eligible leaves/parents. Verify profile readiness, parent nesting, enabled flags and click ID resolution against actual stored data.
- Follow `FOREVER_WORKS/right-click/phase-3/` evidence; distinguish locally mocked behavior from installed-Chrome proof.

## Acceptance

- Save an enabled top-level V3 destination while Legacy active: clear inactive indication, no false menu success.
- Switch to New Right-click V3: Chrome menu contains the saved location without re-adding it; it routes correctly.
- Add child destination, rename, toggle enabled, reorder, delete, save: registration and destination routing update correctly.
- Switch back to Legacy: its saved routes work; no V3 menu leakage.
- On both engines, no “View saved object's URLs…” anywhere in Chrome context menus. Existing URL panel and Get URL work unchanged.
- Reload extension, restart service worker and repeat; no stale entries, silent failure or phantom menu.
- Run existing focused tests plus relevant regression suite; document any preexisting failures and live-testing limitations honestly.

## Deliverable

Fix the actual cause rather than merely changing text. Update `FOREVER_WORKS/v3/HANDOFF_LATEST.md` with exact reproduction, diagnosis, changed paths, test results, installed Chrome evidence or explicit gap, remaining blockers and commit. Work only on isolated V3 branch and push. Do not modify release branch or historic checkpoints.
