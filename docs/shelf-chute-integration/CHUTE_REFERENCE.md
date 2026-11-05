# Chute source snapshot inside REDOWN

Chute is physically copied into `/chute-reference/` as ordinary Git-tracked files, **not a Git submodule**.

- Source repository: https://github.com/thanks-cohn/chute
- Source branch: `main`
- Exact upstream snapshot commit: see the import receipt below.
- Copied with `git archive HEAD` on a fresh upstream checkout.
- All upstream tracked files including HTML, CSS, JavaScript, native bridge, tests and binary image assets are included.
- The original independent Chute repository remains unchanged.
- The copy is for reference and reuse analysis only; REDOWN's Universal File API remains its file engine.
- This folder must not be included in REDOWN's browser-extension package or run as a second worker.

To update: fetch Chute's newest main, replace the tracked source snapshot carefully in one reviewed commit, update the SHA, and test regressions. Never blindly merge different runtimes.

Next step: Codex should inspect the actual source and implement the Shelf UI/drag interoperability described in `latest-1132026/IMPORTANT/P0_CODEX_EXECUTION_SHELF_UNIVERSAL_FILE_API_CHUTE_DRAG_DROP.md`.

- Exact upstream SHA: 3f9033b261667a2ad90af4a13c45701ae717ab12

## P0 implementation audit, 2026-11-04 (Chicago)

`git ls-remote https://github.com/thanks-cohn/chute.git refs/heads/main` returned
`3f9033b261667a2ad90af4a13c45701ae717ab12`; no newer snapshot was substituted.
`git ls-files chute-reference` lists 222 ordinary files, not mode 160000.
The actual checkout path is `/workspace/REDOWN/chute-reference`, not `/chute-reference`.
The canonical Python source is `src/chute/`; `worker-1142026/companion/` contains
another historical source copy. Use `PYTHONPATH=chute-reference/src` for upstream tests.

For a later reviewed update, use an existing authorized Chute checkout:
`git -C /path/to/chute fetch origin main`, inspect the SHA/diff, then export
`git -C /path/to/chute archive origin/main` into a reviewed staging directory.
Replace the existing tracked reference only after reviewing deletions/licenses.
No clone, submodule command or snapshot update was performed here.

REDOWN reuses a small audited browser subset: `extension/chute-image-targets.js`
adapts `direct-drop-google-yandex.js`; `chute-content.js` adapts
`content.js:deliverChuteFile` and `drop-lifecycle.js`; Mini Explorer adapts
`explorer-view.js/css` structure/gestures. Attribution and the full Chute
source-available non-commercial license are preserved in `extension/CHUTE-LICENSE.txt`.
This is not an MIT grant or approval for commercial distribution. Existing
root/bundled REDOWN license drift still blocks normal release packaging.

The explicit package reference traversal includes the new runtime files and
license, and excludes every `chute-reference/` file. No Chute service is installed,
no new OAuth/host/nativeMessaging permission is added, and the reference remains
independently maintained.
