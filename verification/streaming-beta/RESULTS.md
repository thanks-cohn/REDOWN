# Streaming candidate evidence

This directory preserves local evidence. **It is not a live Cloudflare acceptance.**

Starting main: `6c5b49d33786f8cfcc9d8b4eaf421a28af85136c`.

- `generated-corpus-manifest.json`: newly generated authoritative manifest; 12
  payloads, 209,715,200 bytes. Binary corpus is not committed.
- `offline-inventory.json`: Python independently hashed 13 files, including the
  separately classified 1,982-byte manifest. All 12 payload comparisons pass.
- `native-200mib-fixture.json`: actual Python process -> TCP/native relay ->
  extension session -> canonical engine -> extension adapter, using an injected
  provider fixture. 40/40 operations pass: list, 12 uploads, 12 readbacks, 12
  metadata observations, two copies and one directory marker. Zero large-file
  exclusions. All 209,715,200 payload bytes independently verified on Python disk
  readback. Retained acceptance is INCOMPLETE, not a live pass.

Reproduce local corpus/native evidence without Cloudflare:

```sh
python scripts/redown_200mib_corpus.py
REDOWN_CORPUS="$HOME/Downloads/REDOWN-Large-200MiB" node --test tests/streaming-transfer.test.mjs
REDOWN_CORPUS="$HOME/Downloads/REDOWN-Large-200MiB" node --test tests/extension-native-e2e.test.mjs
npm run streaming:test
```

The native fixture intentionally emulates provider bytes in memory; its process RSS
is not product memory evidence. The extension's production path spools on OPFS disk
and uses one multipart buffer. Windows RSS, installed OPFS behavior, live Worker
revision, R2 object truth and TRUE REMOTE source transport remain unverified.

See `docs/releases/CLOUDFLARE-STREAMING-CANDIDATE.md` for actual implementation,
provider publication limits, unfinished requirements and exact Windows CMD steps.

Final local checks:

- Focused engine/Worker/spool/Beta/native regressions: 13 pass, one optional corpus
  check skipped when REDOWN_CORPUS is absent; no failures. The separate corpus-enabled
  SHA run passed all six tests and the separate full native corpus run passed.
- Laboratory suite: 43 pass; independent architecture-report schema checks pass.
- Python suite: 58 pass, one skipped (59 discovered).
- Full reliability: 507 pass, one skipped, ten failures. Seven match its frozen
  baseline and the three additional failure names already appear in
  `FOREVER_WORKS/FAILURE_ATLAS.md`. Full reliability is not green. See
  `regression-summary.json`; no frozen source/evidence hashes were refreshed.
- File engine unit/schema stages pass; preservation stage reports SOURCE_DRIFT for
  the intentionally changed engine. Syntax, generated request/session validators,
  vendored SHA bundle reproducibility and git whitespace checks pass.
- Versioned extension ZIP builds in audit-only mode, with complete runtime allowlist
  and existing license mismatch retained. This is a candidate artifact, not a
  release certificate.
