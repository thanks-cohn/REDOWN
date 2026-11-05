# Evidence scope

This folder contains new November 5 evidence. It does not replace older evidence folders.

- `source-receipt.json`: exact implementation commits/hashes and managed-browser policy.
- `failure-comparison.json`, `baseline-installed.log`, `full-suite.log`: fresh baseline and candidate; 111 identical failing names.
- `final-focused.log`: 29 passing actual-module/event/store/broker tests.
- `p0-browser.json`: actual Shelf/Explorer/API/stage/worker/content code, controlled HTTP and Chrome/provider boundaries; two policy classes, 160 splitter/theme/width cells, gesture/Preview/retention/byte-receipt/aspect/performance cases.
- `browser-regression.json`: existing complete ordinary-browser regression, including 192 scroll configurations and 10,001st-row reachability.
- `before-geometry-cache-browser.json`: retained earlier CPU measurements, with a different host load; do not infer a controlled speedup ratio.
- PNGs and MP4: controlled fixture captures, not installed extension, live provider or website upload proof. The video is explicitly edited excerpts; its exact source hash and ffmpeg command are recorded in `video-receipt.json`.
- `earlier-*.log`: retained failed investigative runs. Some identify product defects (ultrawide minimum, duplicate route); others identify fixture races (detached virtual nodes, transient status, attempting to pointer-click a moving tab). They are not counted as final passes.
- `reliability.json`: actual red reliability receipt at its recorded source head; its older registered failure baseline differs from the fresh 111-name comparison. Later final full-suite/static receipts cover the final implementation. No frozen catalogs were updated to hide findings.

Commands were run in `/workspace/REDOWN` with Node v24.19.0 and installed locked dependencies. Baseline source was archived from `8a3c5e1e041832d16bac09d75a765d202b27e3a0` into `work/p0/base` using `git archive`, with the same root node_modules linked there; `npm test` output is `baseline-installed.log`. No Git worktree was created. Initial dependency-missing and interrupted exploratory logs remain under work and are not baseline evidence.

Reproduce current focused/browser checks:

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
node --test tests/shelf-mini-explorer.test.mjs tests/shelf-splitter-modes.test.mjs tests/shelf-preview-gestures.test.mjs tests/chutey-retry-queue.test.mjs tests/shelf-files-entrance.test.mjs
npm test
npm run check
npm run reliability:check
SHELF_P0=1 SHELF_EVIDENCE_DIR=work/p0/pr-browser node scripts/shelf-mini-explorer-browser.mjs
SHELF_EVIDENCE_DIR=work/p0/pr-regression node scripts/shelf-mini-explorer-browser.mjs
python3 scripts/package_chrome_store.py --audit-only
```

Browser script defaults select `/usr/bin/chromium` and the managed Playwright module. `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` can override those paths. P0 video recording requires Playwright's ffmpeg binary. No environment restriction or extension policy was bypassed. Live ChatGPT/Lens/Image Search/Yandex, installed Chrome 155+, Windows 11, physical low-memory and actual provider/storage failure acceptance remain open.
