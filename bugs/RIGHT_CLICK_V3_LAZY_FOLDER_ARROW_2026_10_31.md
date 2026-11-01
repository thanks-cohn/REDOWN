# BUG — V3 Right-click Setup: folder arrows do not load directories until “Browse folders” is clicked

**Reported:** 2026-10-31  
**Repository:** `thanks-cohn/REDOWN`  
**Branch:** `codex/v3-parity-first-reconstruction`  
**Status:** OPEN — documented only; **do not implement in this recording step**  
**Priority:** P1 — new-user onboarding and basic editor interaction  
**Surface:** REDOWN Right-click Setup pop-out, folder tree and bucket expansion

## User observation

On a fresh/new instance of Chrome, the Right-click Setup folder tree appears to have expand arrows on the left of buckets and folders, but clicking the bucket arrow alone does not populate the available cloud folders. The user must first click **Browse folders**. This is unnecessary, non-discoverable extra work; the arrow should already be the one obvious way to expand and load a directory.

**User direction:** “One shouldn't need to press Browse Folders for the folders to load when people hit the arrow.” Preserve the current editor's look and feel; reduce steps, don't add controls.

## Reproduction

1. Load REDOWN on a fresh Chrome instance/profile with an authorized Cloudflare connection and bucket.
2. Open the **Right-click Setup** pop-out/editor.
3. Find a bucket whose remote child folders have not been fetched/cached in this editor session.
4. Click its **left-side chevron/expand arrow**, or focus the tree item and press the standard keyboard expand key.
5. Observe whether that action alone loads and displays the bucket's immediate child folders.
6. In the reported failure, the arrow changes expansion state but the children do not appear until **Browse folders** is clicked.

The installed-Chrome report is user-observed; exact runtime environment, permissions, and network response have not been reproduced by this documentation step.

## Source-backed likely mechanism — inspect before fixing

`extension/beta/right-click-v3-ui.js` (current branch when reported):

- Around line 136, a generic row's arrow toggle flips the `expanded` state, calls `draw()`, and triggers `browse(profile,prefix)` **only when the key starts with `folder:`**. It omits first-load fetching for `bucket:` keys.
- Around line 154, each bucket separately creates a prominent `Browse folders` button calling `browse(p)`, which loads its root listing.
- Around line 157, previously loaded folder rows can call `browse(p,path)` for their subfolders.
- Around line 168, `load()` pre-expands bucket rows but does not itself populate their remote folder listings.
- `browse()` around line 120 uses `cfDestinationFolders`, caches the corresponding page and cursor in `folders`, then redraws.

These code observations explain a plausible missing first-load path, but do **not** establish a full installed-Chrome root-cause proof or guarantee cloud auth/listing succeeds.

## Expected behavior / acceptance criteria

- Clicking the **bucket's own chevron** must load the bucket's *immediate child folders* on demand if not already cached. It should expand and show them as soon as the page arrives, without first requiring Browse folders.
- Clicking a **folder's chevron** loads that folder's immediate child folders if not already cached.
- **ArrowRight** and the keyboard activation/expand behavior must use the same loading/expansion logic as pointer clicks; ArrowLeft should collapse without destroying cache.
- Previously loaded folders should expand immediately from valid existing cached data. Avoid duplicate concurrent requests for the same scope; preserve partially loaded/paginated results.
- Show a subtle, row-scoped loading indication while fetching; on failure, keep all existing known rows, show a clear scoped error, and allow retry by the same chevron.
- Do not trigger a recursive full-bucket crawl, unrelated bucket listing, or rebuild of the entire RIGHT-CLICK CURRENT graph. Lazy-load the requested scope only, with provider paging handled correctly.
- Preserve keyboard focus, input typing, item selection, form/editing state, existing row geometry, accessibility roles, and the separation between Simple, Narrow and Depth menu behaviors.
- The optional Browse folders action may remain for deliberate manual refresh/picking, but **must never be a mandatory prerequisite** to exploring the tree.
- Acceptance must include a fresh Chrome instance with an initially empty folder-listing cache, not only a warm fixture.

## Suggested regression tests (future repair only)

1. Fresh tree cache + bucket chevron: one `cfDestinationFolders` request at prefix `''`; children appear.
2. Folder chevron: fetch exactly that path; nested children appear.
3. Keyboard ArrowRight/Enter: equivalent expansion and lazy loading.
4. Repeat expand/collapse: valid cached listing reuses data; no duplicate network call.
5. Slow, error or paginated listing: loading state, retry and Load more remain coherent, no disappearing existing nodes.
6. Clicking editor inputs, plus controls or rename fields does not accidentally expand/steal keyboard focus.
7. No implicit whole-bucket scan or discovery side effects just from expanding one folder.

## Scope restriction

**Record only in `bugs/`. No production code changes, no automatic Codex implementation, no redesign, and no task marked fixed by this report.**
