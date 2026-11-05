# P0 Shelf implementation and verification — November 5, 2026

Baseline: latest `origin/main` `5f883546bb9cdfbd4632948a84b8085a6443c788`. Feature branch: `feat/p0-history-guest-ornate-elevator`. Production implementation checkpoint: `f08a490f3677348507e3e3e2791036f79acfbc98` (later delivery commits contain the browser harness/evidence). The owner subsequently explicitly requested pushing the completed work to main. No production Workers or buckets were deployed or mutated.

## Implemented behavior

1. History owns the same archive and date hierarchy. Each entry now presents full accessible filename and actual local time, bounded preview or honest placeholder, collapsed **More** with GO TO/provider/outcome/error/receipt, then independent collapsed **URL**. Public address refresh remains disclosure-triggered with the original exact-object verification. Free mode retains a placeholder without authorizing image reads.
2. The actual Universal File Explorer wraps its existing API with an immutable local adapter. REDOWN.svg is first, Chutey.png second; the original files are read from packaged assets. List, previews, download initiation and drag reads use actual bytes. All local mutations fail. No demo upload, cloud success receipt or transfer History is created. Account discovery clears old samples before showing a verified R2 account; other provider clients perform noninteractive identity/root checks and project truthful setup guidance. Logout restores samples. Existing staging limits/TTL remain unchanged.
3. Settings groups appearance, Explorer, Preview, Click2Cloud, History, recovery and account controls into themed surfaces. Choice buttons update original native preference IDs/values and dispatch existing change handlers; native values synchronize back into button state. Layout uses one column in narrow panels and two at wider widths. All existing controls remain present.
4. Normal remains the default. Elevator moves the original Explorer and nav on entry and exit; a single cancellation epoch prevents stale completion routes. Resize settles the pending destination, rapid reentry reverses from current geometry, reduced motion and deep links bypass animation. Inactive Shelf routes suspend reads/media while retaining the side Preview's selection/expanded state.
5. `previewNavigationAxisV1` is validated as `horizontal` (default) or `vertical`, shared by Shelf, full Explorer media traversal and Window Preview. The focusable expanded panel owns keys without focusing inert rows. Replacing media keeps that surface visible, preserving keyboard focus across consecutive steps. Previous/Next controls respect boundaries. Editing, splitters, media controls and focused document readers retain their keys; existing archive paging remains independent. Closed Preview arrows remain selection-only.

The bundled Chutey PNG is byte-identical to `chute-reference/extension/icons/icon128.png`; REDOWN uses `extension/icon.svg`. The owner explicitly authorized these assets in this session. Attribution and source provenance remain bundled. No new extension permission was added.

## Exact local test receipts

Environment: Linux x64, Node v24.19.0, Chromium 154.0.8037.57. Browser evidence runs actual Shelf HTML/CSS/JS and real packaged image bytes over a local HTTP server; Chrome messaging and cloud transports are controlled fixtures.

| Command | Result |
| --- | --- |
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | PASS |
| `npm test` on a clean archive of baseline `5f88354` | **1,098 tests: 987 pass, 111 fail, 0 skipped** |
| `npm test` after implementation | **1,103 tests: 992 pass, 111 fail, 0 skipped** |
| `node --test tests/shelf-files-entrance.test.mjs tests/shelf-mini-explorer.test.mjs tests/shelf-preview-gestures.test.mjs tests/history-provider-destinations.test.mjs tests/history-quick-glance.test.mjs tests/window-preview-independence.test.mjs` | **53/53 PASS** |
| `node --test tests/entry-point-reliability.test.mjs tests/shelf-files-entrance.test.mjs` | **34/34 PASS** |
| `node --test tests/shelf-mini-explorer.test.mjs` after adding bundled-byte drag staging assertions | **20/20 PASS** |
| `node --test tests/beta-explorer.test.mjs` | **105 pass / 9 unchanged baseline failures** |
| `npm run check` | PASS |
| `npm run explorer:smoke -- --preset all` | **197 pass / 27 fail / 224 total**, retained baseline failures |
| `npm run reliability:check` | FAIL; syntax, API registry and issue inventory pass; architecture remains partial on existing missing `extension/options.js` anchor `presetLocationCache`. Its older pinned regression baseline classifies 105 existing-main failures as new, 6 as known, and has one unseen test. This is not a green release gate. |
| `python scripts/package_chrome_store.py --audit-only` | PASS; **133 allowlisted files**, both runtime assets/modules included. ZIP SHA-256 `2f0b9813a74c2105fcf45cdba3439cbf5f9ced60d6c975a094973a87f94fb35e`. Audit artifact does not establish store/release readiness. |
| `node scripts/shelf-p0-next-browser.mjs` | PASS; **94 screenshots**, zero page errors, no horizontal overflow in checked layouts, no overlapping Settings label/choice surfaces |
| `npm run diagnostics -- getStartGuide`, `validateRegistry`, `listIssues`, `getReleaseReadiness` | Executed offline; registry valid; release remains blocked by existing requirements |
| `git diff --check` | PASS |

The full-suite failure names **exactly match clean main: zero new failures and zero hidden/resolved baseline failures**. See [failure-comparison.json](p0-next-run-evidence/failure-comparison.json) for every remaining failure, [baseline.log](p0-next-run-evidence/baseline.log) and [full-suite.log](p0-next-run-evidence/full-suite.log) for assertion errors. Frozen historical hashes and the older pinned regression baseline were not rewritten. The current Explorer navigation map alone was refreshed using `node scripts/explorer-architecture.mjs --write`.

## Browser evidence

[Browser receipt](p0-next-run-evidence/browser.json), [console receipt](p0-next-run-evidence/browser.log), [all screenshot filenames and SHA-256 hashes](p0-next-run-evidence/screenshots.json).

The fixture verifies real selection without preview reads, explicit double-click open, fully expanded traversal in both axes, first/last boundary, Restore retaining last selection, automatic sample hiding/restoration through account verification/logout, and three measured reverse Elevator round trips. Each round records start/intermediate/final nav rectangles and the descending real panel. No cloned navigation is used.

History/guest FILES/Settings: 320, 390, 540, 700 and 900px × Porcelain/Midnight/Ocean/Neon. Connected FILES and expanded Preview: 320, 390, 540 and 900px × all four themes. Two additional overview captures give 94 PNGs. Representative images below are committed; the complete image matrix is delivered separately in the chat evidence archive.

- [Settings, 320px Porcelain](p0-next-run-evidence/settings-320-porcelain.png)
- [Settings, 900px Midnight](p0-next-run-evidence/settings-900-midnight.png)
- [Settings, Ocean](p0-next-run-evidence/settings-390-ocean.png) / [Neon](p0-next-run-evidence/settings-540-neon.png)
- [History](p0-next-run-evidence/history-540-ocean.png)
- [Guest FILES](p0-next-run-evidence/explorer-390-midnight.png)
- [Connected FILES, controlled account](p0-next-run-evidence/connected-540-porcelain.png)
- [Expanded Preview](p0-next-run-evidence/expanded-390-neon.png)

Visual review found and corrected a wide Settings label/choice overlap, default browser button treatment and hidden guest file labels. Screenshots were inspected with the image viewer; geometry/overlap checks run in the browser harness. The screenshot themes use the actual stored preference event pathway.

## Remaining acceptance limits

- **Installed Chrome BLOCKED** by managed `ExtensionInstallBlocklist: ["*"]`; no bypass attempted. See [policy receipt](p0-next-run-evidence/installed-chrome.json). These HTTP Chromium fixtures are not installed-extension acceptance.
- Live authorized Cloudflare/Drive/Dropbox/OneDrive sessions and real logout/revocation remain untested; connected browser screenshots use controlled account responses. Provider verification delegates to existing clients; no fake logged-in provider is shipped.
- Bundled Chutey bytes pass the actual staging bridge test. Arbitrary third-party website/native Windows drag acceptance remains unverified. Download completion is not inferred from initiation.
- Windows, store distribution, real BOOT/menu registration and live TRUE REMOTE acceptance remain untested in this environment. Their local suites were rerun in the full test/smoke commands, retaining recorded failures.
- Full-suite/reliability/smoke gates remain red due to the explicit pre-existing failures above. This change is locally implemented and browser-fixture verified; it is not release certification or a production deployment.
