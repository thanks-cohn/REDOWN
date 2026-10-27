# REDOWN Cloudflare 200 MiB live acceptance

**Decision: INCOMPLETE. Beta release not certified.**

Source inspected: `cc7cab5` on main; extension 0.5.27; Python client 0.5.6.
The correction commit follows this baseline and is recorded in git history.
UTC observation: 2026-10-27T06:32:12.471Z. Dates in raw evidence are UTC.

## Three evidence layers

A. **REDOWN/owner report:** attached assignment reports one successful 20,768,163-byte
upload, independent SHA-256 readback and metadata check, followed by an indeterminate
copy and 35 untested operations. The original full owner checkpoint/report was not
attached to this session and is NOT VERIFIED here.

B. **Cloudflare observations:** connected integration returned HTTP 200 for bucket
`test-1-new`, default jurisdiction, ENAM. Worker `redown-test-1-new-404399` has STORAGE
bound to that bucket and compatibility date 2026-09-26. Active deployment:
`6dd05412-d7c4-4a52-8198-8be866567db5`; version
`1c10443d-2cd6-461b-b60f-cb27557076af`, 100%, created 2026-10-27T06:12:02.298041Z.
Source inspection confirmed stream-begin, stream-part, stream-complete,
streamingUpload capability and conditional publication code. This is source inspection,
not execution proof. No secrets or deployed source are committed.

Observed test namespace:
`__redown_test__/2900dbca-12cf-459a-b0bd-e472fda5a298/602de898-9824-4686-b804-90922eda6f95/`.
It contains exactly one listed object, `uploads/additional-notes.txt`, 20,768,163 bytes,
last modified 2026-10-27T06:14:04.420Z. No copies were listed. No completed staging
objects were listed under `__redown_upload__/`. The returned listings contained no
continuation cursor. Incomplete multipart uploads, provider error logs and earlier
write completion history are **NOT VERIFIED**. No cloud mutations were performed.

C. **Independent integrity:** the local reproducible corpus is generated and checked
against the retained manifest. That does not prove live R2 bytes. No new independent
live byte hash is claimed. Object size/existence and ETag cannot substitute for SHA-256.

Raw provider observations: `verification/cloudflare-acceptance/provider-readonly.json`.

## Complete authoritative inventory

All 12 payloads total exactly 209,715,200 bytes, excluding manifest. Binary fixtures
are generated with `scripts/redown_200mib_corpus.py` and are not committed.

| Payload | Bytes | Manifest SHA-256 | Live status |
|---|---:|---|---|
| additional-notes.txt | 20768163 | `2bc7a83031f2345dc0f441775ece6f170985adcd4c6545e42c7cb81cc1175269` | Owner-reported upload/readback; live size observed |
| archive-large.zip | 52428934 | `b9e877daf2209a502930236b7447a2734e10f2cc325a309fde82025d0a2b5dca` | NOT TESTED live this session |
| audio-large.wav | 31457324 | `39e7776ab8a1a21ab41e32d5927875c0a65b5a3dbaa1bb22ae783e0c2f5075a4` | NOT TESTED live this session |
| boundary-65535.bin | 65535 | `c7b1f8ff9b12dbb57a4ff66c3fea326c621648833843ed7d044302b63f0d8025` | NOT TESTED live this session |
| boundary-65536.bin | 65536 | `dc64a27791e5df65985cf33cd1e4c58ae4379fb15a42e7d8dfbf15c42968d303` | NOT TESTED live this session |
| boundary-65537.bin | 65537 | `e89173b06ae90138b5cbb27010b9549a054fdf6e45e7d90f585d0b3e2b9b67de` | NOT TESTED live this session |
| image-large.bmp | 25165878 | `437270a3ce7be084ecf5edf1723e1d48be10eeb27e19f8205c3eea9350670d17` | NOT TESTED live this session |
| image-large.png | 16779549 | `9e81678439989d1fc09d1c3cb23cf9689c1c224c14a00dc2f820dcaf3e0a4c40` | NOT TESTED live this session |
| notes-üñíçødé.txt | 10485760 | `75d80a2c3bdc825a5c8089e29baa094669f6d0e993204199a7017604dd2e5090` | NOT TESTED live this session |
| records-large.csv | 31457309 | `544da8b83f974e16890bb1d582c9414283ddcb0329e074fa55812eacd0441719` | NOT TESTED live this session |
| records-large.json | 20971579 | `92853e607ba91df5c12f6c454d590623abb4dfde0b443e82b68c07c2420d2683` | NOT TESTED live this session |
| tiny-4k.bin | 4096 | `e94624ed592d0e6657da18bc132d901fbb7c445ac193d370652beb62f44d25c6` | NOT TESTED live this session |

For every payload, copy, independent copied-byte verification, move, rename,
overwrite, delete and absence confirmation remain **NOT TESTED live this session**.
The first original's existence/size is independently observed, but the copy outcome
remains indeterminate in owner evidence. Absence at one observation is not permission
to replay a timed-out mutation. The original checkpoint must remain preserved.

## Product corrections and acceptance boundary

Python copies now use the existing asynchronous native polling path. The old path
could exceed the native response deadline while the extension continued its copy.
This is a source-confirmed defect/risk, not a proven diagnosis of the owner's copy.
Restart reconciliation now supports streamed sizes and hashes all bytes in bounded
chunks, including Python 3.10 fallback behavior.

Focused regression, Python, full local corpus/native and reliability results are
recorded in `verification/cloudflare-acceptance/RESULTS.md`. Injected provider tests
are explicitly local. They cannot certify installed Chrome or real R2 transfers.

Latency/throughput, per-request provider timing, p95, deployed Worker peak memory,
Windows native overhead and low-memory hardware measurements: **NOT VERIFIED**.
Failure/recovery live scenarios, GUI selection/context menu/drag-and-drop and
TRUE REMOTE transport through Beta: **NOT VERIFIED**.

Move/rename/delete are still explicitly gated by UNSUPPORTED_ATOMIC_DELETE.
Overwrite is absent from the conflict=fail universal contract. These are real open
acceptance gates; declaring the whole suite passed would be incorrect.

## Exact minimum owner steps

This cloud host cannot connect to the owner's localhost native relay. Use the owner's
Windows installation to supply the missing installed extension evidence:

1. Install the correction commit, reload the unpacked extension, and run
   `.venv\Scripts\python.exe -m pip install --upgrade .\clients\python`.
2. In the extension approve read-only access to `test-1-new` covering the old namespace.
   Preserve the original JSON checkpoint. Run:

```bat
.venv\Scripts\python.exe -m redown.lab reconcile --from-report "C:\path\REDOWN-200MiB-ONLINE.json" --report "C:\path\REDOWN-200MiB-RECONCILED.json"
```

3. Keep uncertain writes unreplayed. An absent result does not authorize replay into
   the old namespace. For a fresh run, use a new extension-generated namespace and
   separately approve writes to `test-1-new`; keep the extension page open:

```bat
.venv\Scripts\python.exe -m redown.lab complete --directory "%USERPROFILE%\Downloads\REDOWN-Large-200MiB" --depth Comprehensive --profile Balanced --manifest manifest.json --report "%USERPROFILE%\Downloads\REDOWN-200MiB-RETEST.json"
```

The existing runner's limited operation plan is not the requested full CRUD matrix.
Even an all-PASS run cannot close unsupported move/rename/overwrite/delete, GUI,
interruption or low-memory acceptance. No Worker repair/redeployment is required for
these client/session corrections; the inspected deployed Worker already contains the
streaming routes. Do not change resources or unrelated buckets as part of this retest.
