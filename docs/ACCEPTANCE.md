# Acceptance evidence

**LIVE RIGHT-CLICK SAVE UNVERIFIED — RELEASE BLOCKED.** This is an implementation for review, not a production-readiness claim. No live provider credentials were used and no real cloud objects were created during implementation. The specification requires explicit authorization for that work.

| Provider | OAuth live | Native Chrome right-click → actual save | Independent saved bytes/filename | Gate |
| --- | --- | --- | --- | --- |
| Google Drive | Unverified; own client registration required | Unverified | Unverified | Blocked |
| Dropbox | Unverified; own app registration required | Unverified | Unverified | Blocked |
| OneDrive | Unverified; own public-client registration required | Unverified | Unverified | Blocked |

## Local evidence

Local tests use mocks/fixtures and do not contact real cloud accounts. Source inspection of REDOWN is separately recorded in [EXTRACTION.md](EXTRACTION.md); its historical counts are not Basic test results. Current implementation run: **118 tests passed, 0 failed, 0 skipped** (`npm test`). The checks below are local evidence, not provider acceptance. The current browser permits ordinary HTML/DOM fixtures but its managed `ExtensionInstallBlocklist: ["*"]` policy blocks unpacked extension installation. This is a concrete blocker for installed-extension worker/native-menu acceptance; no policy bypass was attempted. A Shelf fixture does not exercise native extension APIs or OAuth.

API documentation contract tests currently check operation-name parity plus focused behavior cases; they do not establish exhaustive schema/output conformance.

Required local coverage: native three-menu dispatch, source bytes and filename/type validation, OAuth/readiness separation, session finalization/readback, uncertainty and worker interruption, exactly-once counter independent of History deletion, paged History/diagnostics, settings expansion and retention, local ZIP fields/privacy, guarded API parity and UI success/failure indicators. Any gaps belong in this document, not in a success count.

## Executed checks

| Command / check | Result | Evidence boundary |
| --- | --- | --- |
| `npm test` | 118 tests; 118 passed; 0 failed; 0 skipped | Node tests with mocked provider/browser dependencies, fake IndexedDB and DOM fixtures. |
| `npm run check` | Passed | JavaScript syntax and MV3 manifest boundary checks. |
| `npm run package` | Created `dist/redown-basic.zip` | Unpacked-extension archive produced; client IDs still require independent local configuration. |
| `git diff --check` | Passed | Whitespace check; not functional proof. |
| `node scripts/browser-smoke.mjs` | Passed desktop/mobile Shelf, theme, History, Settings and Diagnostics fixture checks | Actual Chromium rendering with mocked extension API/provider data. No installed MV3 worker/native-menu save or cloud mutation. |
| Native browser storage/coordinator probe in `scripts/browser-smoke.mjs` | Passed | Actual Chrome IndexedDB with real Basic coordinator/store/ZIP and a mocked provider adapter: exactly-once replay, deletion/count independence, close/reopen uncertainty, finite retention/OFF/export/re-enable/Unlimited. This is browser-only evidence, not installed MV3/provider behavior. |
| Read-only source repository status | Clean | Original REDOWN was inspected without tracked modifications. |

The browser fixture is a **development test harness** with a temporary local server, not a product server or API. It supplies known mock state to the actual Shelf assets and reports screenshots/checks. Browser-managed policy blocks the attempted unpacked extension load. Its successful fixture interactions cannot establish actual Chrome context-menu dispatch, OAuth redirects, MV3 suspension behavior or live provider functionality. The recorded run timestamp is `2026-11-15T12:51:26.678Z`, with Chromium `156.0.8078.79` on Debian 13; see [browser-evidence.json](browser-evidence.json) and `scripts/browser-smoke.mjs`. The native storage probe uses real browser IndexedDB and the real Basic coordinator/store/ZIP with a mocked adapter. It does not satisfy worker suspension or live provider gates. Screenshot names are recorded without private temporary workspace paths.

## Authorized live procedure still required

For each provider independently, in a Chrome environment permitting unpacked extensions:

1. Configure Basic's own registration/extension identity and authorize sign-in with the intended upload scopes. Confirm GO TO can open the site independently from upload authorization; revoke extension access and verify website login does not imply readiness.
2. With explicit approval to create the test object, right-click a small known file/image fixture and choose the provider's exact native save item. Record native browser menu presentation: Basic adds no parent menu; Chrome may group extension items itself.
3. Inspect provider-side saved object identity, sanitized filename/extension, byte count and independently downloaded bytes/hash against the fixture. Confirm one new ledger count and one successful History record, with exactly two flashes only on the matching card (static equivalent under reduced motion).
4. Exercise consent cancellation/missing scopes, expired/revoked token, inaccessible/HTML source, provider rejection, ambiguous completion and worker interruption without pretending those cases saved. Verify recovery guidance and no automatic duplicate creation.
5. Keep local diagnostics private; redact browsing data before attaching evidence. Record provider, time, browser/version, fixture digest, object proof and result without credentials/session URLs/private response bodies. Delete live test objects only with separate explicit authorization.

If any provider remains unverified or fails, keep the release blocked. Passing unit tests, browser-only UI checks, installability, login, queueing or upload-start requests do not close this gate.

## Portable Shelf continuation

The earlier 118-test report above is the pre-portability baseline. The new sequential Phase A run passes **135/135 tests**, with no failures/skips; details, before/after behavior and live blockers are in [PORTABLE_VERIFICATION.md](PORTABLE_VERIFICATION.md). The same save engine remains checksum-pinned. Real installed side-panel/native-menu and live provider tests remain BLOCKED, not passed.
