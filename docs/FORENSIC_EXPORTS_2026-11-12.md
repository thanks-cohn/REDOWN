# Automatic save forensics — focused implementation

Request: `CODEX_REQUESTS/P1_AUTOMATIC_FORENSIC_DIAGNOSTICS_TWO_ADDITIONAL_EXPORT_BUTTONS_2026-11-12.md`.
Base: `77c6c7d15917c75b939f79577aa26244101f354c`. Working branch: `feat/automatic-forensic-exports-2026-11-12`.

Automatic recording is independent of Debug Mode and Options. One new IndexedDB ledger (`redown-save-forensics-v1`) retains observed save events with the existing attempt IDs, worker epochs, stage times/durations, literal candidate/source/page URLs, destinations, errors/stacks, HTTP metadata and verifier/receipt/accounting observations. Provider changes are observational hooks only: no additional requests, retries, authentication changes, routing changes, or History/counter changes.

The two additional Options buttons are **Export All Diagnostic Data (RAW)** and **Export Secure Diagnostic Data**. RAW requires an explicit privacy confirmation and preserves recorded URL/error strings. SECURE projects a copy of the same stored snapshot, removes private/free-form fields, and uses installation-local keyed HMAC correlations. Neither export mutates the ledger, activates the worker or contacts a provider. Filenames distinguish `REDOWN-FORENSIC-RAW-…zip` and `REDOWN-FORENSIC-SECURE-…zip`; both contain `forensics.json` and a README.

No passwords, OAuth tokens, cookies, authorization headers or response bodies are deliberately collected. Legitimately captured literal URLs and original errors may themselves contain secrets; RAW is private data. Secure output is independently whitelisted rather than relying on URL-only replacement.

Retention is bounded to 4,000 events / 4 MiB of serialized event budget / seven days, with a 256-event pending queue and 64 KiB per-event limit. Oversized events are dropped whole, never silently shortened. Expired records are excluded when reading and pruned on the next append. Loss/failure counts are explicit lower bounds across crashes and unavailable storage; failed/timed-out writes are unconfirmed rather than asserted lost. A separate versioned health key contains counts/status only. A crash before diagnostic commit or failure of both stores can leave gaps. Collection is best-effort and is never awaited by a transfer.

Existing redacted diagnostic data remains untouched. Legacy traces absent from the raw ledger are included with raw URLs/errors marked `not_recorded`; fingerprints are not converted into invented URLs. Metadata identifies schema, scope, collection time, retention, record counts and completeness limits. Unobserved Worker-side source responses/redirects remain unrecorded; no extra probe is made.

## Changed files

| Files | Change |
| --- | --- |
| `extension/forensic-diagnostics.js` | New bounded canonical ledger, health accounting and independent RAW/SECURE projections. |
| `extension/forensic-download.js` | Two explicit ZIP downloads, RAW confirmation, local storage-failure feedback. |
| `extension/options.html` | Exactly two additional buttons, privacy/retention disclosure and the new scripts. |
| `extension/runtime-diagnostics.js`, `extension/save-evidence.js`, `extension/background.js` | Observe existing save lifecycle, original errors, selected routes, verification receipts and bookkeeping. |
| `extension/google-drive-provider.js`, `extension/dropbox-provider.js`, `extension/onedrive-provider.js` | Observe existing job/progress/destination metadata and exceptions. |
| `extension/google-drive-stream.js`, `extension/dropbox-api.js`, `extension/onedrive-api.js` | Observe existing HTTP responses and network exceptions, excluding credentials/bodies. |
| `extension/transfer-counter.js` | Observe original local/IDB exceptions before the existing wrapper; accounting logic unchanged. |
| `scripts/syntax-targets.json` | Register the two new scripts. |
| `tests/forensic-diagnostics.test.mjs` | Focused capture/export/privacy/retention/UI/preservation/side-effect tests. |
| This document | Scope, changed files, limits and validation. |

`extension/options.js`, `extension/diagnostic-download.js` and `extension/diagnostic-bundle.js` remain byte-for-byte unchanged. Every preexisting Options button retains identical markup, labels and IDs. Existing Inspect/Clear/BOOT/Explorer workflows and the original seven-file Diagnostic Bundle format are preserved. Clear traces does not delete this ledger. No existing key/database was reset or migrated.

## Focused validation only

**20 tests passed; zero failed.**

```sh
node --test tests/forensic-diagnostics.test.mjs tests/diagnostic-download.test.mjs \
  tests/save-attempt-diagnostics.test.mjs tests/queue-background-api.test.mjs
```

Coverage includes automatic capture with Debug/Options absent; exact literal URLs and errors; HTTP metadata without body reads; independent SECURE correlation and immutability; worker restart; retention, byte/queue/oversize bounds; storage failures and stale health; old button/handler preservation; RAW cancellation; both ZIP downloads; legacy missing details; and existing diagnostic/native-save fixtures through 21 clicks with unchanged verified counts/no extra transfer calls. UI tests use JSDOM and synthetic browser/provider APIs, not installed Chrome or live providers.

`node --check` passed for all 13 changed JavaScript files. `git diff --check` passed. Full regression, broad repository audits and live/browser/provider acceptance were intentionally **not run**, as requested. No merge or deployment is included.
