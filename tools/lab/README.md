# REDOWN owner-controlled Universal File API lab

Requires Python 3.10+, Node 22+, Git LFS, and Chrome with the repository's extension installed in an administrator-approved environment. No Python packages are required. This is an opt-in developer tool, independent of the existing `local/bridge.mjs` ingest service and unfinished native Windows host.

## Transport and trust

`redown_lab.py` → authenticated loopback `bridge.mjs` → explicitly opened `extension/beta/lab.html` → `createFileApi(createR2Adapter())` → existing Cloudflare OAuth HTTP helper / background messages → existing bucket Worker / R2.

Run the bridge only while testing. Set a random `REDOWN_LAB_TOKEN` of at least 32 characters; never put it into a plan or report. Bridge binds IPv4 loopback only, rejects foreign Origin headers, accepts browser polling/results only from the specified extension origin, bounds control messages and queue size, and limits local file reads to its approved `--root`. Python explicitly bypasses HTTP proxies for this loopback token. No cloud credentials leave Chrome. Existing OAuth renewal and safe Worker transfer logic remain authoritative; no automatic Worker provisioning is exposed.

Python command IDs correlate every dispatch/receipt. A bridge timeout is **uncertain**, never an invitation to replay. There are no automatic mutation retries. Closing the tab or Ctrl+C can leave an operation running remotely. Inspect snapshots, journal, recovery keys, and run ownership before deciding what to do next. Stop in the tab prevents the next operation; it does not cancel a dispatched Worker action.

Version `1.0` is independent of the existing API's numeric version `1`. See `protocol.schema.json`. Unknown major/wire versions fail. Additive optional receipt data can be introduced within this version; incompatible command semantics require a new version. Provider receipts retain original `data` and codes; verification verdicts are separate. No provider request ID is invented where the existing handler does not expose one.

## Owner plan

A JSON plan must explicitly select `provider` (currently `cloudflare-r2`), `accountId`, `bucketName`, a fresh `destination` of `redown-test-lab/<unique-id>/`, absolute `corpus`, exact `files`, ordered `operations`, `max_files`, and aggregate `max_bytes`.

Example:

```json
{
  "provider": "cloudflare-r2",
  "accountId": "OWNER_ACCOUNT_ID",
  "bucketName": "OWNER_TEST_BUCKET",
  "destination": "redown-test-lab/owner-small-001/",
  "corpus": "C:/src/REDOWN/test-fixtures/real-corpus",
  "files": ["1-byte.bin", "minimal.pdf"],
  "operations": ["upload", "download", "copy", "rename", "move", "delete"],
  "operation_files": {
    "copy": ["1-byte.bin"], "rename": ["1-byte.bin"],
    "move": ["1-byte.bin"], "delete": ["1-byte.bin"]
  },
  "max_files": 2,
  "max_bytes": 1048576
}
```

An omitted `operation_files` entry applies that operation to all explicitly selected fixtures. Every fixture starts with upload. A successful copy makes the copy the working object for subsequent rename/move/delete; the original stays in place. All keys, including adapter upload staging, stay in the run prefix. Conflict policy is skip. Plans never derive transfer work from remote listing/traversal. There is no default whole-corpus run.

`inventory` streams SHA-256, rejects LFS pointers, and checks committed LFS OIDs/sizes for tracked fixtures when Git is available. An optional `inventory_sha256` plan pin binds the exact selection's sorted inventory. Before/after local inventories flag fixture modifications. The supplied corpus `manifest.json` is an upstream catalog of 282 source samples, **not** an exact manifest for the flattened checked-in selection. Inventory includes all 240 checked-in files (239 payload samples plus this catalog); the local smoke selects payload samples only. Git LFS identity is used instead of assuming catalog filenames match local names.

## Commands

Run `python tools/lab/redown_lab.py --help`. Global `--port` precedes the command.

| Command | Behavior |
|---|---|
| `doctor` | Python version, authenticated bridge health, connected extension tab; provider readiness needs preflight |
| `preflight --plan plan.json` | Validate owner selection, file integrity/budgets, API capability discovery, saved Worker readiness, and fresh empty run prefix |
| `inventory --corpus ROOT --output inventory.json` | Local streamed file hashes; no cloud operations |
| `snapshot --plan plan.json --output state.json` | Actual raw paginated provider listing, including marker/staging objects; no transfer loop |
| `run --plan plan.json --out work/run-001` | Only explicit scenarios, serial execution, durable intent/receipt/verification journal; stop on failure/uncertainty |
| `run ... --dry-run` | Print validated plan and inventory; no bridge calls or mutation, no run directory |
| `status --run work/run-001` | Saved state, ownership intents, result rows, interrupted/pending work |
| `diff --before before.json --after after.json` | Added/removed/changed object identities/metadata |
| `report --run work/run-001` | Regenerate summary/CSV/Markdown from saved state and journal, including all nonpasses |
| `retry --run OLD --scenario 0:download --plan NEW.json --out NEWDIR` | Explicit unsuccessful scenario selection; fresh prefix required, selected fixtures plus upload/download prerequisites only; no ambiguous replay |
| `cleanup --run work/run-001` | Read-only plan for exact independently verified run-owned objects |
| `cleanup ... --execute` | Rehash exact verified objects, refuse changed/unverified content, delete only selected owned keys, and verify absence; append journal and cleanup.json |

Exit status: 0 for a verified successful run/valid read result; 1 for run results containing nonpass verdicts or executed cleanup containing nonpasses; 2 for input/bridge/preflight errors. Each run includes all requested rows, even when an early failure blocks later work. `PASS`, `FAIL`, `UNSUPPORTED`, `BLOCKED`, `TIMEOUT`, `UNVERIFIED` remain distinct; pass rate denominator is all requested scenarios.

## Transfer and verification limits

Downloads use the new `readStream` method on the shared API and adapter, streaming each chunk through a bounded local sink to disk; Python hashes the resulting bytes independently. The existing Chrome `download` behavior remains unchanged for Explorer/Test It.

Uploads reuse the adapter's existing staged, byte-verified upload. Browser OPFS spools the local stream to a disk-backed File, avoiding whole-file RAM buffers. The existing provider route caps uploads at **300,000,000 bytes**. Browsers without OPFS use an explicit **16 MiB** bounded fallback. Preflight discovers this limit and marks incompatible selections unsupported. OPFS quota errors remain failures. The installed Chrome/OPFS path still needs owner acceptance; local tests exercise the bounded File fallback and a controlled disk-storage interface fixture.

A principal upload/download pair performs one client upload and one independent client download per fixture. The production adapter additionally reads back staged uploads; its Worker performs internal verified copy/move reads. Selected copy/rename/move scenarios add independent destination downloads. Reports separately count client transfer commands and client payload bytes; they do not claim a complete on-wire cloud byte count.

Upload metadata alone is UNVERIFIED. It becomes PASS only after the matching principal download independently hashes correctly. Copy/rename/move require destination hashes, correct source presence/absence, and operation-specific snapshots. Unexpected changes in the run prefix fail the scenario. Observations outside the prefix are deliberately unavailable; the bridge cannot certify no external actor changed other buckets or prefixes.

Cleanup cannot atomically protect against an unrelated external writer between rehash and provider deletion because the existing R2 delete route has no conditional delete. Keep the run prefix exclusive. Cleanup refuses unverified staging recovery objects and preserves them for owner reconciliation; it never recursively deletes a prefix. Run history and prior failures remain intact. Local downloaded files stay in `work/bridge-downloads` as evidence; OPFS spool entries are removed after normal completion, but a crashed browser can leave local `redown-lab-*` entries.

## Regression tests (offline)

```sh
npm ci --no-audit --no-fund
node --test tests/lab-bridge.test.mjs tests/beta-explorer.test.mjs
python -m unittest discover -s tests -p test_redown_lab.py -v
node scripts/lab-local-smoke.mjs work/local-smoke-UNIQUE
npm run check
npm run reliability:check
```

The local smoke selects exactly 24 genuine small fixtures across 24 extensions, uploads/downloads each once in its principal round-trip, and limits copy/rename/move/delete to two fixtures. It uses production handlers and Worker code with **emulated R2 storage**, not live R2. It produces the same report artifacts plus `local-provider.json` explicitly identifying zero genuine cloud transfers. No full-corpus transfer is run by this script.

See `docs/beta/PYTHON_CLI_UNIVERSAL_API_HANDOFF.md` for measured results and the complete Windows PowerShell workflow.
