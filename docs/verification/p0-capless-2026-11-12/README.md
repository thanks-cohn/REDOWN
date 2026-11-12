# Evidence index — 12 November 2026

See [the review/report](../../P0_CRASH_CAPLESS_REPORT_2026-11-12.md). Artifacts are local test/evidence receipts, not installed Windows or real-provider acceptance. Test text logs normalize trailing whitespace only; the owner ZIP is byte-for-byte unchanged.

- `owner-post-crash-secure.zip`: unchanged owner SECURE upload. RAW is kept private; both hashes and the redacted comparison are in `owner-capture-redacted.json`.
- `storage-before.log`: three assertion failures against dc1a4e1, not a test syntax failure. `storage-after.log`: the same three assertions pass on the repairs.
- `regression-final.log`: 93 scoped passes. Includes the 950-save native-listener/in-memory-R2 fixture and optional-recorder failure isolation.
- `native-950.json`: exact fixture counts, independently checked fixture objects, counter/receipt uniqueness and archive integrity. No real provider traffic.
- `stress.json`: 100k synthetic records in fake IndexedDB; RAM-backed and not a browser memory measurement.
- `browser/result.json`, `browser/*.png`: production controls/recorder on isolated localhost in real Linux Chromium with mocked extension APIs, actual disk-backed IndexedDB, 100k synthetic events. Screenshots visibly label the fixture. Heap after GC is not Windows RSS or GPU crash evidence.
- `installed-chrome.json`: unpacked installation explicitly BLOCKED by administrator policy. No extension screenshot/live acceptance is claimed.
- `syntax.json`, `build.json`: focused syntax/import closure and reproducible source fingerprint. Installed commit is not observable.
- `reliability-incomplete.json`: stopped broad reliability-wrapper execution; preserve its failures and incomplete flag. It is not a full-suite pass. `oauth-compatibility.log` preserves an additional existing mock import failure (first import already present on main).
- `SHA256SUMS`: hashes of all evidence here, excluding that checksum file itself.

Repeat the scoped checks from the repository root:

```sh
REDOWN_FLIGHT_BASELINE=1 node --test tests/flight-recorder-storage.test.mjs
# Expected: 3 failed baseline regression assertions.
node --test tests/capless-archive.test.mjs tests/capless-controls.test.mjs tests/flight-recorder-storage.test.mjs tests/flight-native-saves.test.mjs tests/chrome-reload-crash.test.mjs tests/worker-bootstrap-first-install.test.mjs tests/entry-point-reliability.test.mjs tests/forensic-diagnostics.test.mjs tests/diagnostic-download.test.mjs tests/boot.test.mjs
node scripts/flight-build.mjs
node --expose-gc scripts/capless-stress.mjs
node scripts/capless-browser.mjs work/p0-capless/browser
node scripts/installed-chrome.mjs extension work/p0-capless/installed-chrome.json
```

The browser scripts create only their own temporary profiles and localhost fixtures. They do not touch the owner's installed profile or authenticate providers. Do not change Chrome policy to make the installed test pass. Follow the report's manual Windows procedure, including external evidence capture **before** Reload when Options is unavailable.

A successful archive commit confirms an IndexedDB transaction and digest chain, not an OS-level fsync guarantee. All retained counts have a recorded observation scope; none establishes a lifetime success percentage.
