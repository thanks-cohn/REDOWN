# CMD Laboratory implementation and acceptance handoff

Status: partial implementation, not an accepted release. Starting commit:
`14af6e522117b3e139325e7ef13dd14b421d0d6c`, branch `fix/lab-result-codes`.
Related: https://github.com/thanks-cohn/REDOWN/issues/39.

## Implemented and locally exercised

- Local manifest comparison uses the independently computed inventory hashes. JSON
  `files` arrays (or a top-level array) require one path field (`path`, `relpath`,
  or `name`), one integer size field (`bytes` or `size`), and `sha256` per row.
  Ambiguous fields, duplicate paths/JSON keys, traversal, malformed hashes and
  unsupported schemas fail explicitly. No claim of media decoding is made.
- The manifest itself is classified separately. Additional artifacts require exact
  repeatable `--artifact RELATIVE_PATH` arguments. Unlisted files fail verification;
  no README, extension or wildcard is automatically trusted. The JSON keeps every
  observed hash, byte count, exclusion and per-payload comparison.
- Missing/mismatched/unexpected files are FAIL. Files excluded by scan limits are
  NOT_TESTED. Absent default manifests remain NOT_TESTED to preserve ordinary local
  scanning; an explicit missing `--manifest` fails. Gate A requires an actual PASS
  comparison, never merely a successful hash-only exit.
- Verified manifests determine payload selection for cloud planning; manifests and
  explicitly approved artifacts are not uploaded as payload. A failed/incomplete
  comparison blocks cloud dispatch. Reports must be outside the input directory.
- Offline runs write an fsynced JSON checkpoint and readable Markdown companion,
  without constructing Chrome/GUI/network dependencies. Exit 0 means local checks
  passed, 1 means integrity failure, 2 means incomplete. Cloud acceptance remains
  INCOMPLETE even when local checks pass.
- `complete --owner-config ... --journal ...` launches the **existing**
  `agent/files/cli.mjs`, `bootstrap`, scoped session, universal engine and `r2-http`
  adapter through the existing Python `Client`. No second transfer coordinator,
  queue, OAuth implementation or direct Python R2 uploader was added.
- CMD requires exact bucket/prefix approval and hidden entry of an existing leased
  Worker bearer. It does not silently use environment/browser credentials. The
  client checks a single dedicated test bucket/root, restricted operation set and
  expiry within four hours; the existing engine authorizer checks expiration on
  each operation. The Worker must independently enforce the lease. Existing
  journals are refused for new writes. Credentials are passed in the child
  environment, never arguments or reports. Noninteractive secret entry is refused.
- Progress is throttled to about once per second on stderr, JSON summary on stdout.
  Counts and byte rate are observations; byte rate is verified bytes / elapsed
  runner time, not pure network throughput. Windows RSS remains NOT_TESTED where
  the standard library cannot measure it reliably.

## Gate status and remaining implementation

| Gate | Status | Evidence still required |
| --- | --- | --- |
| A | Owner corpus pending | Actual Windows manifest schema, exact extra-file identities and all payload matches |
| B | Integration prepared, live blocked | Provisioned, narrowly scoped expiring test Worker lease; real CMD upload/readback |
| C | NOT IMPLEMENTED / NOT TESTED | Streaming/chunk contract through existing engine, conditional finalization, independent streaming readback and all failure/recovery cases |
| D | BLOCKED | A, B, C must pass before GUI changes |
| E | BLOCKED | Actual CMD and GUI acceptance; no release tag created |

The 13 files / 209,717,248 bytes observation does **not** identify the extra files.
Their names and contents are unavailable on this host. The new report will identify
all 13 and compare them with the expected payload set. A regression fixture with
11 payloads totaling 209,715,200 bytes plus two artifacts totaling 2,048 bytes
checks accounting only; it is not the owner's corpus and is not transfer proof.

The extension Worker still caps conditional-create at 65,536 bytes. The older
leased standalone laboratory adapter, Worker and universal engine cap bounded
base64 requests at 2 MiB. Neither supports large streaming through the engine.
These are different existing transports, not a claimed upgrade of the extension.
Do not raise caps or deploy the temporary laboratory Worker over a production
Worker. The old lease preparation binds four dedicated buckets; it is not a
finished single-bucket credential issuance/onboarding flow. Current CLI scope
narrows use to one bucket, but server-side binding/credential narrowing is still
needed before claiming the complete least-privilege workflow requested here.

Cloudflare documents bucket/prefix-scoped temporary S3 credentials:
https://developers.cloudflare.com/r2/api/s3/temporary-credentials/ and
https://developers.cloudflare.com/api/resources/r2/subresources/temporary_credentials/methods/create/.
That is a possible future transport credential path, not an implemented S3 adapter
or permission to introduce a parallel engine. No account token is requested by
this CMD implementation. No OAuth client registration or live lease was available
for end-to-end authorization here.

Standalone read-only recovery is also unfinished: the current `reconcile` CMD
entrypoint still uses extension authorization. Do not reuse a standalone journal
or treat creating a fresh journal as resolving an uncertain write. Preserve both
reports and obtain separately approved read-only reconciliation before further
mutations. The CLI does not implement destructive cloud cleanup.

## Owner: Gate A exact commands

From the existing repository directory in Windows CMD:

```bat
git checkout fix/lab-result-codes
git pull --ff-only
.venv\Scripts\python.exe -m pip install -e .\clients\python
.venv\Scripts\python.exe -m redown.lab complete --directory "%USERPROFILE%\Downloads\REDOWN-Large-200MiB" --depth Comprehensive --profile Balanced --offline --manifest manifest.json --report "%USERPROFILE%\Downloads\REDOWN-Large-200MiB-Manifest-First.json"
echo Exit code: %ERRORLEVEL%
```

Return the JSON/Markdown reports privately. In particular, return
`localInventory.manifestVerification`, `inventory.exclusions` and any manifest
schema error. The first command may correctly fail on unexpected files. Inspect
those files before adding an exact `--artifact` argument; do not delete them or
regenerate hashes to manufacture a pass. Use a **new report filename** for the
approved rerun. Gate A requires expectedFiles=11, expectedBytes=209715200,
verifiedFiles=11, status=PASS, and no missing/unexpected/unverified payloads.
If the actual generator schema differs, preserve its manifest and adapt the parser
with a fixture rather than replacing the owner's manifest.

## Standalone small-file test prerequisites and command

This is a prepared integration, not a turnkey lease issuer. Do not run until a
new explicitly approved leased laboratory Worker has been provisioned separately,
with a known endpoint, fresh `__redown_test__/UUID/` prefix, short expiry and its
bearer delivered privately. Expiry/revocation must be enforced at the Worker;
revocation means invalidating its bearer/lease, not merely editing local JSON.
No deployment or production-cloud mutation was performed here.

A non-secret owner scope JSON has this shape; replace endpoint, UUID and expiry
with the **actual** provisioned lease. Expiry must include timezone and be within
four hours. Do not include the bearer in this file.

```json
{
  "expiresAt": "ACTUAL_ISO_8601_EXPIRY_WITH_TIMEZONE",
  "adapters": [{
    "type": "r2-worker",
    "endpoint": "https://ACTUAL-NEW-LAB-WORKER.workers.dev",
    "prefix": "__redown_test__/ACTUAL-UUID/",
    "authorizationEnv": "REDOWN_CMD_LEASE"
  }],
  "scope": {
    "operations": ["list", "metadata", "read", "upload", "copy", "mkdir"],
    "maxOperations": 100,
    "locations": [{
      "provider": "r2-lab", "account": "lab", "container": "test-1-new",
      "key": "__redown_test__/ACTUAL-UUID/"
    }]
  }
}
```

Use an owned small-file directory with a passing manifest, not the full 200 MiB
corpus. Install Node and the repository's existing dependencies (`npm ci`) first.
Then the command is:

```bat
.venv\Scripts\python.exe -m redown.lab complete --directory "%USERPROFILE%\Downloads\REDOWN-CMD-Small" --depth Comprehensive --profile Balanced --manifest manifest.json --owner-config "%USERPROFILE%\Downloads\REDOWN-CMD-Owner-Scope.json" --journal "%USERPROFILE%\Downloads\REDOWN-CMD-Small-First.journal.json" --report "%USERPROFILE%\Downloads\REDOWN-CMD-Small-First.json"
echo Exit code: %ERRORLEVEL%
```

Type the displayed bucket/prefix approval, then enter the leased `Bearer ...`
credential at the hidden prompt. No REDOWN GUI or browser tab is used by this
execution path. Preserve both engine journal and reports; do not post secrets.
The runner still returns incomplete (2) for selected-case success because its full
acceptance contract includes unimplemented failure/streaming/recovery cases.
A real verified small-file result is needed before Gate B can be credited.

## Local verification evidence

[Machine-readable evidence](../../verification/cmd-lab/local-verification.json)
records source hashes and boundaries. Linux Python suite: 59 tests, 58 passed,
one skipped, zero failures. The 65,537-byte integration uses the actual stdio
session, universal engine, R2 adapter and Worker handler with simulated storage;
it is not live Cloudflare evidence. Full reliability: 499 passed, nine failed;
seven match the recorded baseline. The two additionally classified failures
(issue-inventory explicit labels and options provisioning refresh) were separately
reproduced on an untouched archive of starting commit 14af6e5. Syntax,
architecture, API registry and issue inventory validation stages passed. No
historical evidence assertions were weakened or refreshed.
