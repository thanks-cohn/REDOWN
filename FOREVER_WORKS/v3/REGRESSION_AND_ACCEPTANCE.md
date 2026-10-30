# Verification and acceptance

See `evidence/results.json` for exact command outcomes and final versus baseline failure-name comparison, `evidence/final-reliability.json` for full local evidence and `HANDOFF_LATEST.md` for remaining tasks.

The new focused suite covers canonical validation, exact nested targets, disabled ancestors, subtree removal, stale IDs, independent engines, actual serialized background commits, restart reconstruction, Chrome create/remove failures, isolated UI controls in both modes, pre-v1 Legacy routing, actual ingest URL compatibility, read-back-before-completion and packaged runtime closure. Source/HTML checks reject retired setup mounts and hooks; the actual packager rejects retired imports. Package contents include V3, Legacy and Shelf Settings and exclude old editors/reorder UI.

Existing public-address and Bucket URL consent fixtures remain required. Only the extraction boundary of the unchanged Options domain control test was updated after removing its following obsolete setup function; its assertions are unchanged. The existing Get URL stale-enable failure is retained and explicitly compared with the baseline.

Full reliability remains blocked. Historical catalog/source hashes are not refreshed. Existing tests referencing removed UI files or helper functions are left visible and fail; they require an explicit replacement/retirement pass against V3 requirements. Passing focused fixtures do not erase this regression debt or establish current-feature parity.

Release gates remain: installed Chrome menu/lifecycle, live disposable Cloudflare exact-byte save, History/Explorer confirmation, independent validation of existing Explorer operations, baseline debt disposition, full-app accessibility/themes, and existing package/license owner reconciliation. No normal release package or store publication is authorized by an audit artifact.

Two existing Legacy runtime fixtures (`simple-menu-flat` and the native ordering case in `menu-reorder`) now load the new engine module and retained runtime resolver before exercising the actual builder. Their assertions are unchanged: 12/12 pass. This is fixture wiring maintenance, separate from the unresolved removed-editor tests. Focused V3 + public-address + Bucket URL consent: 29/29 pass (41 distinct targeted tests with the Legacy set).
