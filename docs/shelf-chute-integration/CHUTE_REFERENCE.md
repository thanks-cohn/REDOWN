# Chute full-source reference for REDOWN Codex

**Imported:** 2026-11-04
**Location:** `/chute-reference` (Git submodule, not a copied directory)
**Upstream:** https://github.com/thanks-cohn/chute
**Pinned main commit:** `3f9033b261667a2ad90af4a13c45701ae717ab12`
**Purpose:** Full HTML/CSS/JavaScript layout, native worker and cross-site drag-and-drop source visible to Codex after submodule initialization.

## Initialize the complete source

```bash
git clone --recurse-submodules https://github.com/thanks-cohn/REDOWN.git
# Or from an existing REDOWN worktree:
git submodule update --init --recursive chute-reference
```

**Codex must verify these files are physically present in the worktree:** `chute-reference/README.md`, `chute-reference/extension/manifest.json`, `chute-reference/extension/explorer-view.js`, `chute-reference/desktop/chute-desktop.cpp`, plus relevant CSS, HTML, tests, `worker/` and `worker-1142026/` files. Do not consider the import ready if `chute-reference` is empty or only a Git pointer; execute initialization and fail visibly if inaccessible.

## Why a pinned Git submodule?

- Reaches all upstream files, **including original image assets/binary files**, without individually copying or altering them.
- Keeps Chute standalone, preserves exact commit identity and allows independent updates.
- Prevents accidentally packaging all of Chute as a second REDOWN extension/worker: reference is outside REDOWN's `extension/` runtime. Audit packaging scripts to guarantee this.
- A GitHub browser will show the `chute-reference` gitlink. To view source locally, initialize submodules; GitHub web may link directly to the pinned Chute source instead of displaying nested files under REDOWN.

## Updating the pin

```bash
git -C chute-reference fetch origin main
git -C chute-reference checkout origin/main
git add chute-reference
git commit -m "chore: sync Chute reference to reviewed upstream main"
```

Record the new SHA and test any interface changes before merging. Never edit the submodule's tracked source as if it were REDOWN-native code; publish changes in Chute first or use a clearly separate REDOWN adapter. No auto-update on builds.

## Architectural authority

- **REDOWN Universal File API:** only cloud browsing/file operations engine.
- **REDOWN Shelf UI:** expandable provider/S3 bucket sidebar, compact Chute-inspired visual interactions.
- **Chute:** source reference and separately integrated real-file drag bridge, not a second remote file API.
- The reference's source-available license is not a generic open-source grant. Reuse/redistribution and packaging must be assessed against its terms; both repositories are under `thanks-cohn`, but that alone does not override third-party rights.

See `latest-1132026/IMPORTANT/P0_CODEX_EXECUTION_SHELF_UNIVERSAL_FILE_API_CHUTE_DRAG_DROP.md` for acceptance tests. This commit adds the pinned complete-source reference, **not** the mini Explorer implementation.
