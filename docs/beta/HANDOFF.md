# Beta Explorer handoff — 27 October 2026

Branch: **`beta-explorer`**. Starting head: `5802719`.

Verified main: `ec6d5cfc964e1fe2b3d73403a5cf8d5dc0555059`. No main update, production deployment, store publication or live cloud mutation was performed.

The session began around 03:39 CDT; handoff preparation began at minute 25, around 04:04 CDT. Implementation ends here; final minutes are reserved for verification and publication. This is a verified partial implementation, **not full original-Explorer parity or a release certificate**.

## Published implementation

- `dfee97375cf82931f0a3b739a05c8e7fcffdb0d3`: configurable defaults, parity actions and red/white UI.
- `30a66f02f6344d41f329e5a0bf9a4169d04173b1`: archive extraction, dropped directories, timeout fixes, API documentation and verification fixtures.
- The final delivery commit contains this handoff plus the final grid-header/accessibility polish. Its exact SHA is supplied in the delivery message; it is the branch head after publication. A commit cannot contain its own SHA.

Git push lacked terminal credentials. Publication uses the connected GitHub Git-data API with an expected-head lease, followed by fetch and local/remote tree comparison. Only `beta-explorer` is updated; no force update is used.

## Implemented and locally verified

The existing core API paths remain in place for accounts/buckets, list/stat, uploads/downloads, mkdir, copy/move/rename/delete and TRUE REMOTE.

New API-backed GUI actions include:

- Saved Cloudflare destination navigation with redacted profile reads; same-account navigation preserves Back history.
- Bucket creation and explicit reuse of production destination/Worker setup; complex Simple/Nested menu editing remains in original settings.
- Duplicate with Keep both; explicit account/bucket/folder Copy to and Move to dialogs.
- Bounded image/media/PDF/plain-text preview, previous/next controls and object-URL cleanup. Active text/code formats render as text. Text is truncated explicitly at its configurable byte budget.
- Get URL through the original public-address popover and API read. No automatic publication or enabling of public access.
- ZIP/CBZ inspection and selected extraction through the actual production Worker. Complete entry paths are preserved; existing destinations are not overwritten. Individual extraction requests are batched without silently clipping the selection to one Worker request.
- Dropped directory traversal consumes every reader batch and uploads File handles with their nested relative paths. Empty dropped directories are explicitly not materialized.
- Original remote transfer history read; this does not add local upload/copy history or a durable journal.
- Alt+Left/Right/Up, Backspace and F5 navigation shortcuts alongside the existing selection/clipboard/rename controls.

The interface now uses warm white surfaces, crimson accents, charcoal text, CSS tokens, grouped controls, roomy file rows, list/grid layouts, accessible focus states and responsive dialogs. Grid mode hides the list-only column header. Chromium fixture checks report no horizontal overflow at four viewport widths.

## Effective configuration

Precedence: **per-operation override > session preference > provider default**. `setPreferences` replaces preferences; `{}` restores defaults. Unsupported or inactive operation options are rejected before dispatch. Settings actually affect request arguments, timing, callbacks, preview bytes or concurrent dispatch; no inert multipart options are advertised.

| Setting | Provider default |
| --- | ---: |
| Background-message wait | 120000 ms |
| HTTP request timeout | 30000 ms |
| Local upload deadline | 300000 ms |
| Entire byte-verification deadline | 300000 ms |
| Verification read inactivity deadline | 30000 ms |
| Verification progress interval | 100 ms; zero reports each chunk |
| Inline preview memory | 64 MiB |
| Text preview bytes | 512 KiB |
| Batch concurrency | 1 |

See [API_DEFAULTS.md](API_DEFAULTS.md) for option names, operation membership and examples. Fixture tests prove request precedence, upload timeout arguments, concurrent dispatch, real message timeouts, idle/whole-verification deadlines, progress-frequency differences and preview-budget effects.

Cancellation prevents remaining dispatch. A write already dispatched may still complete remotely and is reported as uncertain. Concurrent in-flight items are awaited and retained in input order. Ambiguous writes are not automatically replayed. Throwing presentation callbacks do not change confirmed provider results.

Timeout testing exposed a real issue with read-only DOMException messages. Errors are now wrapped without trying to mutate that message, retaining uncertain upload state and the staging recovery key.

## Real restrictions and remaining gaps

- **Local uploads above 300,000,000 bytes remain unsupported by this REST method.** Its endpoint limit remains enforced. No multipart implementation or fake threshold/part-size control was added.
- Actual **50 MiB and 51 MiB fixture uploads pass**, so 50 MiB is not an API ceiling. This is not arbitrary-size or live-provider proof.
- The 300 MB local restriction is not applied to copy/move/download/remoteIngest. The original remote Worker retains its own MAX_BYTES and other constraints; unlimited TRUE REMOTE sizes are not claimed.
- The original background Worker transport still has a 30-second management deadline, 15 seconds for capability/probe calls. Provisioning, OAuth, safe-read retry and Chrome-download listener bounds also remain inherited. Extending the Beta message wait cannot bypass nested deadlines. These remaining production defaults were not rewritten during this timebox.
- Staging upload bytes are streamed and compared byte-for-byte against the original File; final Worker copy receipts are validated. Independent final-object SHA-256/live acceptance remains outstanding.
- Recursive/cross-bucket search, full destination-profile/menu editing, archive-entry preview/download, cross-bucket archive clipboard, 3D-model preview, zoom/pan parity, expanded recovery UX and durable job resume remain gaps.
- Folder-tree download is unavailable; source inspection confirms the original Explorer also declines ordinary folder downloads. Empty directory drop preservation is unavailable. These must not be described as completed parity.
- Native Chrome-download completion callbacks are retained. Long-running provider/browser behavior, OAuth reconnect, PDF/media playback and installed-extension acceptance still require real testing.

See [PARITY_CHECKLIST.md](PARITY_CHECKLIST.md) for the short source-based matrix. No full-parity claim is made from fixtures.

## TRUE REMOTE and preservation

`remoteIngest` still sends the URL and explicit destination to the original `ingest` pipeline. Beta does not fetch or relay remote-source payloads. Original native right-click handlers, URL capture, auth, destination resolution, Worker acquisition and notifications were not rewritten.

`extension/background.js`, `extension/options.js`, `extension/cloudflare-api.js` and `extension/manifest.json` are byte-identical to the starting branch. Source/fixtures establish preservation; original right-click/live R2 behavior was not retested in an installed extension.

Pagination is unchanged: the existing 1000-item listing page size, cursor extraction/validation, metadata page guard and repeated-cursor checks remain. No pagination configuration or refactor was introduced.

## Verification and honest result

- `node --test tests/beta-explorer.test.mjs tests/explorer-worker.test.mjs`: **57/57 pass**.
- Full suite via `npm run reliability:check`: **408 tests, 398 pass, 10 fail**.
- Untouched `5802719` archive with the same dependencies: **392 tests, 382 pass, 10 fail**. All ten failing test names match exactly; no new failing name against the branch baseline.
- Historical reliability policy knows seven failures and labels three additional failures as new. Those same three reproduce on the untouched branch. The overall reliability result therefore remains failed, and the existing architecture-freshness stage also fails. No historical hashes or failing assertions were refreshed/relaxed.
- Syntax, API registry and issue inventory stages pass; `git diff --check` passes.
- `scripts/beta-explorer-preview.mjs` passes in ordinary headless Chromium with fixture Chrome messages and intercepted HTTP: text preview, URL routing, preference UI, archive dialog, destination chooser, grid toggle and widths **1440/1024/768/390**; zero page errors or horizontal overflow.
- No installed-extension or live R2 tests, cloud credentials, owner bucket writes or independent live SHA-256 verification were used.

[VERIFICATION.json](VERIFICATION.json) contains exact baseline failure names and scoped results. The browser script accepts `REDOWN_PLAYWRIGHT_MODULE`, `REDOWN_CHROMIUM_PATH` and `REDOWN_PREVIEW_OUTPUT`; it needs Playwright/Chromium installed separately and does not add a runtime extension dependency. Browser screenshots generated during QA are temporary fixture evidence, not live screenshots.

## Files changed

- `extension/beta/file-api.mjs`, `r2-adapter.mjs`: operation routing, effective preferences, cancellation/outcome handling and production-service reuse.
- `extension/beta/configuration.mjs`, `dropped-files.mjs`: validated defaults and payload-free folder traversal.
- `extension/beta/explorer.html`, `explorer.mjs`, `explorer.css`: working controls and red/white interface.
- `tests/beta-explorer.test.mjs`: API, actual embedded Worker and jsdom interaction regressions.
- `scripts/beta-explorer-preview.mjs`, `scripts/syntax-targets.json`: reproducible Chromium fixture and syntax coverage.
- `docs/beta/PARITY_CHECKLIST.md`, `API_DEFAULTS.md`, `VERIFICATION.json`, this `HANDOFF.md`: parity, usage and honest evidence.

## Next single highest-value task

Run an **installed Chrome acceptance session against an owner-authorized disposable R2 namespace**, exercising the complete upload → read-back/SHA-256 → copy → rename → nested move → download → delete lifecycle and both original/Beta TRUE REMOTE entry points, including the actual 51 MiB corpus. This will separate browser/provider blockers from already-passing local fixtures before further parity work or release claims.
