# REDOWN versus Cloudflare R2 capabilities

Inspected 2026-10-27. Source baseline: `cc7cab5` (extension 0.5.27, Python 0.5.6).
This document distinguishes source implementation, provider documentation, live metadata,
and independent byte verification. It is not a release certificate.

## Sources and evidence

- [Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [R2 limits](https://developers.cloudflare.com/r2/platform/limits/)
- [Consistency and conditional writes](https://developers.cloudflare.com/r2/reference/consistency/)
- [Multipart uploads and ETags](https://developers.cloudflare.com/r2/objects/upload-objects/)
- [S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Worker limits](https://developers.cloudflare.com/workers/platform/limits/)
- Live read-only observations: `verification/cloudflare-acceptance/provider-readonly.json`.
- Universal operations: `extension/file-engine/universal-operations.mjs`.
- Adapter: `extension/file-engine/adapters/extension-r2.mjs`.
- Multipart transport: `extension/lab-worker.mjs`; deployed template: `WORKER_SOURCE` in `extension/background.js`.
- Python polling: `clients/python/redown/extension.py`; reconciliation: `clients/python/redown/recovery.py`.

| Operation | REDOWN claims | REDOWN implementation | Cloudflare documented capability | Live Cloudflare evidence | Gap or limitation |
|---|---|---|---|---|---|
| Upload | Conditional create, independent SHA-256 readback | Multipart staging, conditional single PUT publication | Streams, single PUT and multipart; conditional PUT returns null on failed condition | Original additional-notes.txt exists, 20,768,163 bytes | Full corpus live NOT VERIFIED; source publication ceiling 5,363,466,240 bytes, not a universal API limit |
| Download | Streamed OAuth read, Python disk hash | readStream and bounded disk spool | get returns ReadableStream | Original metadata observed; no new byte readback in this session | Independent live SHA-256 NOT VERIFIED |
| Copy | Preserve source, verify destination SHA-256 | Stream source through existing createStream, full readback | S3 copy; Workers composition through get/put | No copy destination in inspected run namespace | Native synchronous deadline defect corrected locally; live cause remains unproven |
| Paste | Explorer action | Application maps destination to copy | No native clipboard | NOT VERIFIED | GUI acceptance untested |
| Move | Requires safe source removal | Adapter blocks with UNSUPPORTED_ATOMIC_DELETE | get/put/delete primitives; no documented conditional delete argument in Workers binding | NOT TESTED | Adapter capability restriction; do not equate ordinary delete support with atomic revision-conditional deletion |
| Rename | Content-preserving move | Same deletion gate | No native atomic key rename in Workers binding | NOT TESTED | Implementation/contract gap, not evidence that R2 cannot store renamed bytes |
| Overwrite | Fail on conflict | Contract accepts only conflict=fail | Conditional PUT supports revision match | NOT TESTED | Missing universal update/overwrite contract and adapter implementation |
| Delete | Revision-safe deletion | Disabled in extension adapter | delete(key or keys), up to 1000 keys per call | NOT TESTED | Atomic conditional deletion safety requirement not supplied by current binding |
| Directory creation | Prefix marker | Zero-byte trailing-slash object | Object keys and list prefix/delimiter, not native directories | Historical marker found in a separate test namespace | Empty marker differs from implicit prefix; fresh GUI NOT VERIFIED |
| Directory copy | Recursive composition | Paged traversal; <=1000 nodes, <=32 levels; can partially complete | Per-object operations, no atomic directory transaction | NOT TESTED | Partial-copy recovery and full tree acceptance untested |
| Directory move | No unsafe source removal | Unsupported | No native atomic directory move | NOT TESTED | Missing safe engine/adapter mechanism |
| Streaming | Bounded buffers, backpressure | 256 KiB frames; 8 MiB default multipart buffer; OPFS disk | ReadableStream and multipart | Deployed source contains stream-begin/part/complete and conditional publication | Installed memory and end-to-end live behavior NOT VERIFIED |
| Multipart recovery | Preserve uncertain checkpoints, never blind replay | Canonical part receipts; read-only reconciliation; durable resume uncertified | resumeMultipartUpload requires known key/uploadId; default incomplete upload expiration seven days | No completed __redown_upload__/ staging objects at observation | Incomplete uploads NOT VERIFIED: ordinary object listing does not enumerate them |

## Provider-specific conclusions

R2 writes, deletes and listings are strongly consistent. Concurrent writes to a key
still require atomic preconditions; checking head and then doing an unconditional
write/delete is not a transaction. Directory operations span multiple keys and must
report partial completion rather than imply atomicity. Cached/public responses are
not substituted for authenticated object observations.

Multipart ETags are derived from part MD5 digests and part count. Neither those
ETags nor custom checksum metadata prove an independent SHA-256 comparison.
The observed original has ETag `c6dca0e05b673024ad50133bd9d2cd9a`; this is not its SHA-256.

Official documentation currently describes 5 MiB minimum multipart parts except the
last, 10,000 maximum parts, and identical sizes except the last. REDOWN uses 8 MiB
parts. Workers have a 128 MB per-isolate memory limit, shared across concurrent
requests, so local fixture memory cannot establish deployed memory safety.
REST object access is rate-limited; its overhead/rate budget must be distinguished
from Workers binding transfer time. Provider and native messaging deadlines are
separate constraints. Actual throughput/p95 and Worker CPU are NOT VERIFIED here.

## Gap classification and corrections

- REDOWN implementation defect: copy used synchronous native execute despite possibly
  long streaming work. Copies now use existing streamExecute/streamStatus; no replay.
- REDOWN implementation defect: restart reconciliation rejected files above the inline
  65,536-byte limit even with streaming available. It now uses bounded whole-file hashing.
- Untested functionality: live copy retest, all-file CRUD matrix, GUI, low-memory Windows,
  interruptions, incomplete multipart inventory and Worker diagnostics.
- Performance/resource concern: source publication uses conditional single PUT; full
  multipart-size-range publication remains unfinished. Native copy polling does not
  remove Worker request/resource limits.
- Documentation discrepancy: historical unsupported summaries are not proof of current
  provider capability. Read adapter declarations and live evidence separately.
- Authorization/access restriction: this host has no owner Windows native connection,
  approved installed extension grant, or saved live uncertain-job checkpoint.

Do not remove safety gates to make acceptance green. Provider-specific support belongs
behind the existing adapter, with explicit scope, preconditions, and reconciliation.
