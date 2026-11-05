# P0 acceptance evidence

**Not release-certified.** Phase A source audit and Phase B controlled File payload
proof are complete. Phase C implements the R2 Mini Explorer and honest provider
fallbacks. Phase D live destinations/native handoff and Phase E Windows acceptance
remain blocked by [issue #51](https://github.com/thanks-cohn/REDOWN/issues/51).
Do not describe this PR as the complete P0 acceptance pass.

Environment: Debian GNU/Linux 13 x64; Node 24.19.0; Python 3.12; Chromium
154.0.8037.57. Evidence recorded November 4, 2026 America/Chicago (November 5 UTC).
Base main: `dae5050bfc3c3ce10a39245ef6464ecd61f4579c`.
Source snapshot details and ownership are in SOURCE_AUDIT.md and
ARCHITECTURE_AND_AUTHORITY.md. The `evidence/` directory contains only synthetic
fixture data, source hashes, local reports and screenshots, no customer data.

## Required matrix

Every unresolved row below is tracked in #51. PASS is always qualified by its
method; local PASS cannot waive installed/browser/provider release gates.

| ID | Status | Method, expected / actual, proof |
|---|---|---|
| NAV-01 | PASS (local) | Router test finds File Explorer beside Remotes/History/Settings, opens same section, zero tab/window calls; `focused.log` |
| NAV-02 | BLOCKED (installed) | Local route switch retains selection/path; browser widths 320/360/540/900 have no horizontal overflow. Real Shelf/popout/restart focus acceptance not run; `browser.json`, screenshots, `installed-chrome.json` |
| SHELF-01 | BLOCKED (installed) | Same-document local view and modal only; no helper calls. Real extension opening blocked by administrator; `installed-chrome.json` |
| API-01 | PASS (controlled) | Same actual `createFileApi(createR2Adapter())` as full Explorer; account/bucket/key paths and authorized byte stream asserted, no competing network backend; `focused.log` |
| RAIL-01 | BLOCKED (live provider) | Fixture account -> photos -> Images, paged list/rail ownership implemented. Real authorized R2 listing not performed; `browser.json`, `focused.log` |
| RAIL-02 | BLOCKED (adapter) | Two R2 accounts with same bucket name stay distinct in tests. Generic S3 adapter absent from existing Universal File API; no false Cloudflare nesting |
| RAIL-03 | PASS (limitation path) | Drive/Dropbox/OneDrive link to current Remotes with explicit missing browse/read support. No expanded scopes, phantom children or invented adapter |
| RAIL-04 | BLOCKED (installed popout) | Local narrow inline drawer and expanded panes fit tested widths, screenshots attached. Real Shelf/popout collision acceptance outstanding |
| UI-01 | BLOCKED (installed) | Local click selects without Download; shared Side/Window Preview reused; genuine browser drag creates File. Full installed gesture/preview matrix outstanding |
| UI-02 | BLOCKED (screen reader) | Arrow/Home/End/Enter/Space tree/list handlers, ARIA expansion/selection, context menu keyboard handlers implemented. Human screen-reader acceptance not run |
| DND-01 | BLOCKED | ChatGPT real attachment/name/bytes receipt unverified; no account/site test performed |
| DND-02 | BLOCKED | Google Lens and Image Search separately unverified; domain routing unit-tested, excludes Drive/Gemini and lookalikes |
| DND-03 | BLOCKED | Yandex Images live acceptance unverified; domain routing tested only |
| DND-04 | PASS (controlled negative) | Untrusted synthetic page drop ignored; unrelated ordinary drags require private MIME; type/budget/refusal and no URL fallback implemented. External unsupported-site UX still requires installed testing |
| DND-05 | BLOCKED (full matrix) | Local cancellation, expiry, size-change/same-size-etag replacement, budget, one-use receiver/frame/chunk boundaries tested. Native huge/multiple files unsupported in v1 |
| DND-06 | BLOCKED | Browser staging store survives worker recreation in tests. Windows cross-window/native restart not tested; disabled Chute enrollment documented |
| PERF-01 | BLOCKED (real media load) | Controlled 1/10/100/1,000/10,000 metadata listings, bounded rows and scroll measured. No eager thumbnails/full-resolution media. HD video + thumbnail burst + live navigation acceptance not run |
| PERF-02 | BLOCKED (physical hardware) | deviceMemory=4 selects 8 MiB budget in browser simulation. This does not emulate a physical 4 GB Windows machine or OS memory pressure |
| STATE-01 | PASS (local races) | Late A response cannot replace B data even when abort is ignored; rail queues cannot block foreground; expiry/invalidation/receiver isolation tests. Real OAuth revocation remains unverified |
| REG-01 | BLOCKED (baseline/live) | Existing Shelf/History/Quick Glance suite run; baseline failures retained. Installed History/GO TO not certified |
| REG-02 | BLOCKED (baseline/live) | Full Universal API/V3/BOOT/provider suite run; no second engine/menu/opener. Baseline failures retained |
| REG-03 | BLOCKED (release license) | Audit package includes runtime/Chute license and zero reference files; permissions/scopes unchanged. Existing root/bundled license drift blocks release packaging |

## Commands and interpretation

- `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` completed.
- Initial diagnostics: getStartGuide, validateRegistry, listIssues,
  getReleaseReadiness; no cloud mutation or repair run.
- `npm test` was run before changes and after implementation; exact counts and
  failure-name comparison are in `evidence/regression-comparison.json`: baseline
  1,064 / 953 pass / 111 fail; final 1,077 / 966 pass / the same 111 fail.
  No additional failing test names were observed.
- `node --test tests/shelf-mini-explorer.test.mjs`: 13/13 local focused tests pass.
- `node scripts/shelf-mini-explorer-browser.mjs`: both ordinary Chromium fixture
  variants pass. Re-run with PLAYWRIGHT_MODULE and CHROMIUM_PATH as needed.
  Provider/runtime messaging is explicitly mocked; IndexedDB, File, DataTransfer,
  trusted browser drag and actual input bytes are browser implementations.
- `PYTHONPATH=chute-reference/src python3 -m unittest discover -s chute-reference/tests`:
  76 tests, 9 Windows-specific skips, zero failures. Earlier attempts using no
  PYTHONPATH / historical companion path failed import; corrected to canonical src.
- `npm run check`: syntax and classic worker import closure pass.
- `npm run reliability:check`: syntax, registry and issue validation pass;
  architecture and regression gates remain red. Architecture findings concern
  unchanged main options/background sources. No frozen hashes/baselines refreshed.
  The checked-in historical seven-failure policy does not describe the session's
  actual 111-failure main baseline. See comparison; do not call this full green.
- `npm run explorer:smoke -- --preset all`: 224 tests, 197 pass, 27 fail; captured
  failures compared with the initial full baseline in regression-comparison.json.
- `python3 tests/boot-schema-conformance.py`: six valid / three invalid fixtures
  handled correctly.
- `python3 scripts/package_chrome_store.py --audit-only`: 128 runtime allowlisted
  files; new adapter/license present, zero `chute-reference/` entries. Audit-only
  artifact is not a release approval. Exact hash in package.log.
- `node scripts/installed-chrome.mjs /workspace/REDOWN/work/p0-installed-package work/p0-installed-chrome.json`:
  **BLOCKED**, CDP -32600: unpacked loading disabled by administrator; no bypass.

## Performance budget and limits

Local fixture budget: under 200 ms per navigation for <=10,000 metadata entries,
under 16.7 ms average for a scroll/render update, at most 24 mounted rows in the
350 px list. Recorded navigation and 100-update scroll timings are in browser.json;
these are observed harness timings, not provider latency or Windows claims.
No baseline Mini Explorer existed. No improvement over the full Explorer is inferred.
The deviceMemory=4 run changes only the 8 MiB staging limit, not machine RAM.
Large transfers use existing Download/picker; no huge file is silently buffered.

## Rollback

Revert the feature commit/PR. Existing provider adapters, full Explorer, History,
V3 and BOOT owners are unchanged. Remove extension IndexedDB database
`redown-chute-v1` when no handoff is active if immediate local staging removal is
needed; otherwise active code expires records within one minute plus alarm/wake
latency. View preferences are `shelfExplorerV1` and `shelfLastViewV1`; no credential
migration is required. No Worker deployment, provider mutation, OAuth scope
change, native install or store publishing was performed. The owner subsequently
explicitly authorized integration into main; this does not waive the documented
P0 release gates.
