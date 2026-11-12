# Verification index — 12 November 2026

[Investigation/fix report](../../P0_AUTH_RECONNECT_CRASH_FOLLOWUP_2026-11-12.md). All Chrome API/OAuth/provider fixtures are simulations unless explicitly described as owner observations. No installed Windows/provider pass is claimed.

- `focused-final.log`: combined focused regression run.
- `baseline-provider-final.log`: three targeted assertions fail on starting-main code; an additional matching healthy-isolation test passes.
- `baseline-recorder.log`: main's legacy 16-slot failure reproduced. These four regression assertions pass in the implementation.
- `full-regression.json`: exact completed wrapper result, failures, gate states and tested-source binding. It is not green.
- `full-comparison.json`: untouched f9f6d0d main fixture versus implementation. Failing-name comparison does not prove assertions inside already-failing cases are unchanged. The baseline-only lab bridge case is not claimed fixed.
- `source-inventory.json`, `build.json`: scoped source/test hashes, protected byte checks and build fingerprint. Installed commit is not observable.
- `native-950.json`: 950 production native-listener/in-memory-R2 writes and independent fixture HEADs; no real cloud traffic. Google revoked/OneDrive unavailable state projections are present.
- `shelf-browser/*`: real Linux Chromium production Shelf DOM/CSS, synthetic extension/OAuth/tabs APIs, 15 keyboard/accessibility/responsive assertions. Screenshots explicitly label the fixture.
- `recorder-browser/*`: real Linux Chromium disk-backed IndexedDB, production recorder/control panel extracted into a fixture, 100k synthetic events, checksums, heap sampling and non-destructive legacy incident migration.
- `installed-chrome.json`: administrator policy blocks unpacked extension installation; no bypass attempted.
- `SHA256SUMS`: evidence hashes, excluding the checksum file itself. Text logs normalize trailing whitespace only; no owner RAW data is included.

Focused command (repository root):

```sh
node --test tests/provider-reconnect.test.mjs tests/capless-archive.test.mjs tests/capless-controls.test.mjs tests/flight-recorder-storage.test.mjs tests/consolidated-dropbox-login.test.mjs tests/forensic-diagnostics.test.mjs tests/diagnostic-download.test.mjs tests/entry-point-reliability.test.mjs tests/worker-bootstrap-first-install.test.mjs tests/chrome-reload-crash.test.mjs tests/flight-native-saves.test.mjs tests/boot.test.mjs tests/visible-queue.test.mjs tests/shelf-queue.test.mjs tests/queue-background-api.test.mjs
```

Additional commands:

```sh
REDOWN_FOLLOWUP_BASELINE=1 node --test --test-name-pattern='Graph 503|Google revoked|Google native admission' tests/provider-reconnect.test.mjs
REDOWN_FOLLOWUP_BASELINE=1 node --test --test-name-pattern='legacy 16/16' tests/capless-archive.test.mjs
npm run reliability:check
node scripts/flight-build.mjs
node scripts/reconnect-browser.mjs work/p0-followup/browser
node scripts/capless-browser.mjs work/p0-followup/recorder
node scripts/installed-chrome.mjs extension work/p0-followup/installed-chrome.json
```

Baseline probes deliberately fail. The full baseline comparison used a plain `git archive` of f9f6d0d in a task-specific temporary fixture, shared Git history for read-only historical assertions and a separate temporary index. It did not checkout/reset the shared repository or create a Git worktree. Dependency versions were identical.

Browser scripts create/remove only their own temporary profiles and localhost fixtures. They never use the owner's profile or credentials. Forced-GC JS heap is not Task Manager RSS or a Windows/GPU/crash test. Follow the report's manual Windows procedure, preserving external evidence before Reload when Options cannot open. Never publish RAW exports.
