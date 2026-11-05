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
