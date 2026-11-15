# REDOWN-hosted Basic — Phase B

Phase A was completed, tested and committed **before** this transplant. Source: `thanks-cohn/redown-basic`, branch `implement/portable-shelf-auth-host-v1`, exact SHA `128ee88e2660327e87cba8b60865e6c0e92bc5d1` (135 passing tests; GitHub CI passed). Destination: `thanks-cohn/REDOWN`, branch `basic/portable-rehost-v1`, created by `git switch --orphan` with an empty tracked tree. Classic baseline remains `c78babc314acc5891203e95b169f027756e956c1` on its original ref and remote main.

This is a separately maintained alternate edition with **no parent/shared ancestry** with classic main, not a normal merge candidate or deletion patch against main. No main branch, tag, original browser installation, console registration or cloud resource was modified. All Phase A files were copied from its immutable `git archive` and verified before applying the two profile overlays. No source worktree symlinks/runtime imports are used.

[TRANSPLANT_MANIFEST.json](TRANSPLANT_MANIFEST.json) lists every source file SHA-256 and the only modified source files: `deployment/redown-hosted.json` and `deployment/default.json`. Added files are provenance, this report, a fixture screenshot, hosted-specific tests and a narrow Markdown whitespace attribute preserving intentional hard line breaks in the immutable copied specification. `tests/hosted.test.mjs` checks every unchanged copied file and compares both generated runtime cores, excluding only generated public config/manifest. Classic dependencies and application files are absent.

## Results and before/after

| Check | Result | Boundary |
| --- | --- | --- |
| Original classic baseline | Source/identity inspected; legacy application suite NOT TESTED | No claim about classic live behavior or its unrelated historical tests. |
| Phase A source | PASS, 135/135 tests, zero failed/skipped | Existing 118 baseline checks retained plus portable Shelf/auth/data checks. |
| Hosted transplant | PASS, 140/140 tests, zero failed/skipped | Same 135 tests + 5 full-copy/build/registration portability tests. All provider calls mocked. |
| `npm ci --ignore-scripts` | PASS | Same frozen dependency tree: one runtime ZIP library, test-only IndexedDB/DOM packages. |
| `npm run check` | PASS | JS syntax and MV3 boundary. |
| `npm run package -- --profile standalone` | PASS | Independent standalone still builds with blank clients/no classic key. |
| `npm run package -- --profile redown-hosted` | PASS | Generated key, Google manifest/scopes and public callback expectations validated. |
| Runtime core equality | PASS | No differences between variants except generated config and manifest. Original save engine checksums unchanged. |
| Browser fixtures | PASS | Actual Chromium rendering, narrow Shelf, sun/moon and browser IndexedDB/coordinator/ZIP. All provider/extension APIs mocked. |
| Installed side-panel/toolbar/native menus/MV3 | BLOCKED | Managed `ExtensionInstallBlocklist:["*"]`; no bypass. |
| Live OAuth and right-click saved bytes | BLOCKED for all three providers | No explicit live authorization/isolated permitted installation; console compatibility remains unknown. |

Executed in this repository: `npm ci --cache /workspace/.npm-cache --ignore-scripts --no-audit --no-fund`; `npm test`; `npm run check`; both explicit profile package commands; `BASIC_EXTENSION_PATH=/workspace/REDOWN/dist/redown-hosted/extension node scripts/browser-smoke.mjs /tmp/redown-portable-phase-b`; `git diff --check`. Browser fixture observed initialization approximately 136 ms (local observation, not a production guarantee). See [browser evidence](phase-b-browser-evidence.json) and [narrow dark fixture](visual/phase-b-narrow-dark.png). Existing classic live data was never inspected.

## Public registration compatibility versus real readiness

[Classic public registration evidence](classic-public-registration.json) records the pinned source SHA and source checksums. The public manifest SPKI key derives Chrome ID `mkadkgpekmkknfbniacdlmgikihjjepf`, matching both original provider identity checks. That exact public key is emitted only into the hosted build. Google public client and Drive `drive.file` match classic source. Dropbox uses its existing public app key and four source-declared scopes; OneDrive uses its existing Entra public client, common authority and three source-declared scopes. Chrome callbacks are expected exactly:

- `https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/dropbox`
- `https://mkadkgpekmkknfbniacdlmgikihjjepf.chromiumapp.org/onedrive`

| Provider | Public source/key/callback consistency | New Basic extension authorization | Real upload/read-back |
| --- | --- | --- | --- |
| Google Drive | PASS static; Chrome registration console binding UNVERIFIED | BLOCKED, not inherited from classic | BLOCKED |
| Dropbox | PASS static; actual enabled app permissions/callback console state UNVERIFIED | BLOCKED; fresh PKCE consent required | BLOCKED |
| OneDrive | PASS static; Entra platform/tenant/Origin/CORS compatibility UNVERIFIED | BLOCKED; fresh PKCE consent required | BLOCKED |

Configured public IDs produce **AUTH_REQUIRED**, not Ready to Save. Tests prove no implicit Google cached-grant read, OAuth popup, provider request or old credential migration occurs. Prior classic authorization cannot certify the transplanted extension. Basic's namespace/counter remain separate, and a changed binding requires explicit sign-in without deleting History or counts.

**LIVE RIGHT-CLICK SAVE UNVERIFIED — RELEASE BLOCKED.** Owner action still needed: authorize live tests, supply/verify standalone public registrations and hosted console compatibility, and use an isolated Chrome profile allowing unpacked extensions. For each provider, interactively authorize this build, exercise refresh/revocation/reconnect, then explicitly approve a tiny fixture upload and independently verify provider object identity/name/bytes/hash and exactly one count/History outcome. Microsoft SPA/Origin/CORS restrictions must be observed, not assumed away. Do not install over classic REDOWN or change provider consoles without separate approval. No cloud objects were created or deleted in this task.
