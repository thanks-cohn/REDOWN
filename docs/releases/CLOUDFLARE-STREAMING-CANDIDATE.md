# Cloudflare streaming candidate 0.5.27

Implementation candidate, **not a verified Cloudflare Beta release**. Python client: 0.5.6.

The existing canonical engine accepts `transfer: {size, sha256}` on API 0.3 uploads,
and `transfer: {size, sha256?}` on reads. Payloads travel through trusted source/sink
callbacks, outside JSON journals. Inline content/Base64 limits remain message limits,
not transfer-size limits. Existing authorization, idempotency, checkpoints and result
states apply. Missing stream capabilities fail explicitly.

The extension adapter reads OAuth response streams, hashes incrementally and checks
size and revision. Local upload source bytes are checked before final publication;
destination bytes receive an independent full OAuth readback. Copy uses the same
streaming primitives. Reconciliation reads large destinations incrementally.

Native messaging uses bounded 256 KiB binary frames encoded as Base64. OPFS spools
one file per approved grant on disk. Python does not contact Cloudflare or receive
credentials. Long operations return a pending response and use polling so the native
35-second response deadline does not become a file-size ceiling. CMD reports bytes
while staging, uploading, verifying and receiving readback. Sources are rehashed and
checked against the inventory before upload. Python downloads independently hash
bytes written to disk and remove failed partial local outputs.

The existing embedded STORAGE Worker accepts multipart staging uploads. Parts default
to 8 MiB, serialized; the trusted factory permits 5–64 MiB part budgets. Completion
publishes with conditional PUT, preserving existing destination objects. Completed
staging objects are removed only after confirmed publication. Ambiguous writes are
not replayed. Part IDs/receipts are retained in the canonical job's transfer checkpoint.

**Provider constraint:** R2 Workers multipart completion has no conditional-create
option. Conditional publication therefore uses R2 single PUT and is limited to
5 GiB minus 5 MiB (5,363,466,240 bytes). This is reported as
`PROVIDER_CONDITIONAL_PUT_LIMIT`, not as an engine/message limit. Supporting the full
R2 multipart object-size range while preserving atomic fail-on-conflict remains
unfinished. This candidate does not satisfy the assignment's full large-file target.
References: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
and https://developers.cloudflare.com/r2/platform/limits/.

The existing Beta page now binds configured Cloudflare profiles to the existing
universal engine. It reuses its bucket/folder, upload, activity and status controls.
Upload accepts binary files; Download streams into Chrome's file save picker and
commits the local file only after verification. Missing/replaced authorization blocks
operations. Move/delete remain disabled where the provider cannot atomically condition
source deletion. Small text preview retains its bounded inline path.

## Verification and remaining boundaries

- Generated corpus: 12 payloads, exactly 209,715,200 bytes. Node SHA-256 and the vendored
  incremental SHA-256 independently matched every generated manifest entry.
- Actual Python processes, TCP/native frames, extension session/adapter and canonical
  engine, **injected provider fixture**: 40/40 planned operations passed; all 12 files
  uploaded and independently read back; 209,715,200 verified readback bytes. No large
  files excluded. See `verification/streaming-beta/native-200mib-fixture.json`.
- Embedded Worker multipart, collisions, interrupted source, source hash mismatch,
  corrupt/truncated readback, revision changes, revocation and spool framing have
  focused local regressions. These are not installed-browser/live-provider proof.
- Connected Cloudflare read-only check confirmed `test-1-new` exists. No bucket objects
  or deployed Workers were changed by this session.
- The available cloud browser has no REDOWN session. Browser policy rejects extension
  management navigation. Owner Windows/native registration, OPFS behavior in an installed
  extension and live R2 transfers remain unverified.
- Existing TRUE REMOTE implementation remains in `background.js`; it has not been
  live-verified or routed into the new Beta GUI during this change. This release gate
  is still open. No browser-mediated source download is substituted for TRUE REMOTE.
- OPFS requires sufficient disk quota. Abrupt browser termination may leave spool
  files. Incomplete multipart uploads follow bucket lifecycle rules; completed staging
  objects from ambiguous/failed publication may remain. Durable upload resumption and
  automatic staging cleanup are not certified. Preserve uncertain-write evidence.
- Existing historical evidence/architecture and GUI failures keep full reliability
  non-green. Frozen evidence hashes were not rewritten.
- Packaging remains audit-only because existing root/extension license texts differ.
  No verified release tag, store upload or production deployment was made.

## Minimum Windows live test

From the updated repository, with the existing virtual environment:

```bat
.venv\Scripts\python.exe -m pip install --upgrade .\clients\python
.venv\Scripts\python.exe scripts\redown_200mib_corpus.py
```

Reload the unpacked extension from the updated `extension` directory. In REDOWN
Settings, use the existing Repair action for **test-1-new only**, so its existing
Worker receives the new streaming capability. No Worker is deployed automatically
by discovery or preflight. Open Python Laboratory, select only `test-1-new`, separately
check write approval, start the local connection and keep the extension page open.
This extension approval surface is required; the Python GUI is not required.
If registration is missing, run the existing installer with the exact installed ID:

```bat
.venv\Scripts\python.exe -m redown.install_host --extension-id YOUR_INSTALLED_EXTENSION_ID
```

Run CMD and approve its matching pairing code in the extension:

```bat
.venv\Scripts\python.exe -m redown.lab complete --directory "%USERPROFILE%\Downloads\REDOWN-Large-200MiB" --depth Comprehensive --profile Balanced --manifest manifest.json --report "%USERPROFILE%\Downloads\REDOWN-200MiB-ONLINE.json"
```

The grant mints a new isolated namespace. Keep the complete JSON report, including
failures and uncertain outcomes. Do not replay uncertain writes or delete unrelated
objects. An all-PASS operation matrix alone is not the unimplemented TRUE REMOTE,
Windows resource, interruption/recovery or full-release acceptance evidence.
