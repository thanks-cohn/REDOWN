# Python CLI ↔ Universal File API: implementation handoff

Branch: **beta-explorer**. Implementation base/corpus commit: **531546e**.
Implementation commit: recorded below after the implementation checkpoint is committed.

This handoff covers a working owner-run loopback bridge and test framework. **Live R2 verification is BLOCKED. Genuine cloud uploads: 0. Genuine cloud downloads: 0.** No authorized installed Chrome session or R2 provider credentials were available in this execution environment. Local production-handler tests are not live-provider proof.

## Delivered components and actual entrypoints

| Path | Implemented behavior |
|---|---|
| `tools/lab/redown_lab.py` | Python standard-library CLI, explicit owner plans, immutable inventory/LFS integrity, scenario runner, snapshots, independent SHA-256, durable journal, recovery inspection, reports, safe retry planning, verified ownership cleanup |
| `tools/lab/bridge.mjs` | Version 1.0 authenticated loopback control server; approved filesystem root, bounded control/queue/chunk limits, upload file streaming, ordered download sink, correlated deadlines/receipts |
| `tools/lab/protocol.schema.json` | Normative JSON Schema 2020-12 command/receipt and verification verdict definitions |
| `tools/lab/README.md` | Contract, plan format, command reference, limits, verification and recovery semantics |
| `extension/beta/lab.html`, `lab.mjs` | Explicit owner session tab; token held in tab memory; scope enforcement; API dispatch; browser disk-backed upload spool and streamed download sink |
| `extension/beta/file-api.mjs` | Existing `createFileApi` dispatcher with additive `listRaw` and `readStream` operations |
| `extension/beta/r2-adapter.mjs` | Existing adapter; raw exact-object pages, streaming read sink, optional scoped upload staging prefix; default Explorer staging remains unchanged |
| `extension/beta/configuration.mjs` | Options for additive shared API methods; onChunk accepted only by readStream |
| `extension/manifest.json` | Loopback host permission for explicit lab connection |
| `tests/helpers/beta-provider.mjs` | Existing Beta provider fixture extracted for reuse; production background functions and embedded Worker around emulated R2 |
| `tests/lab-bridge.test.mjs`, `tests/test_redown_lab.py` | Transport/dispatch/integrity/false-success/failure/interruption/cleanup regression coverage |
| `scripts/lab-local-smoke.mjs` | Fixed 24-format small real-corpus local acceptance run; no live provider connection |
| `scripts/syntax-targets.json` | New JavaScript entrypoints included in existing syntax checks |

The existing `local/bridge.mjs` is a separate ingest-only service, not this bridge. `windows/README.md` describes a native app whose referenced C source is missing; no working Python client/native messaging host existed to reuse. The new tool therefore needs no native-host registration and does not claim to repair that unfinished native app.

Actual path:

1. Python `Client.call` sends a versioned command to `POST /command` on 127.0.0.1.
2. The explicit extension tab polls `/next`, validates account, bucket, prefix and keys, and calls `createFileApi(createR2Adapter()).run`.
3. Reads and uploads use the existing `RedownCloudflareApi.request` in `extension/cloudflare-api.js`, including saved OAuth renewal and session checks.
4. Copy/move/rename/delete use the adapter's existing `cfTransferObjects`, `cfRenameEntry`, `cfDeleteObjects` messages, handled in `extension/background.js` by `transferExplorerObjects`, `renameExplorerEntry`, `deleteExplorerObjects`.
5. Those handlers use the embedded production `WORKER_SOURCE` bound to `STORAGE`. `worker/src/index.js` is not substituted.
6. `/result` returns the unchanged operation data/error with correlation; Python separately lists/stats/downloads/hashes to determine verdicts.

No provider engine or cloud credential store was added to Python. The bridge does not expose connect/provision/repair, public access changes, arbitrary background messages, or arbitrary external URLs.

## Working commands and operation coverage

All requested CLI commands are implemented: `doctor`, `preflight`, `inventory`, `snapshot`, `run`, `status`, `diff`, `report`, `retry`, `cleanup`. Run dry plans with `run --dry-run`; cleanup is a plan unless `--execute` is supplied. No default cloud destination, fixture selection, operation set, or whole-corpus run exists.

The owner runner supports serial, exact-file upload/download/copy/rename/move/delete scenarios. `operation_files` limits specific operations to selected fixtures. The bridge additionally dispatches scoped mkdir/list/stat/connectionStatus, but mkdir is not yet an owner-run scenario. Archives, overwrites, directory mutation scenarios, remote ingestion, cross-provider tests, parallel scenarios, automatic resume, and native messaging are unavailable through this CLI. They are not silently counted as passed; unsupported requests fail explicitly. Existing Beta Explorer/Test It operations remain available on their original paths.

Uploads reuse existing byte-verified staging and final safe transfer. The bridge places staging under `<run-prefix>/_staging/`, so no mutation escapes the run prefix. OPFS spools to a disk-backed browser File; the existing provider limit is 300,000,000 bytes per file. Without OPFS the bounded fallback limit is 16 MiB. Capability preflight rejects oversized selections. Installed Chrome OPFS, local-network access policy, quota handling, and large-file behavior remain owner acceptance items.

Snapshots use `listRaw`, preserving actual marker and staging objects rather than Explorer presentation filtering. They are scoped to the chosen prefix, paginated and bounded to 1,000 pages / 10,000 objects. They do not hash every remote object automatically. Independent download hashes are recorded for selected content scenarios; provider ETags are never treated as SHA-256.

Upload metadata alone remains UNVERIFIED; a matching independently downloaded principal file upgrades that upload to PASS. Copy/rename/move require destination SHA-256 and source-state checks. Before/after operation snapshots detect unexpected changes. The fixture inventory is checked again at completion. Final snapshot failures and unexpected objects remain visible. The run never automatically retries an ambiguous write.

## Executed verification and measured evidence

The checked-out corpus was materialized with `git lfs install --local` and `git lfs pull`, then independently inventoried against committed LFS OIDs and sizes. **240 files, 388,827,943 bytes (370.815 MiB)**; no LFS pointers were used as file content. This includes 239 payload samples and the upstream `manifest.json` catalog. That upstream catalog describes 282 source samples and is not treated as the flattened local corpus manifest.

Measured acceptance:

- Real-corpus local smoke: **24 unique payload files, 24 extensions, 10,255 fixture bytes; 56 requested / 56 executed / 56 PASS**. Principal client transfers: 24 uploads and 24 downloads. Exactly two fixtures also underwent copy/rename/move/delete, adding six independent destination downloads. Explicit client payload bytes: **20,579**. Initial measured elapsed time: **2.944 seconds**. Unexpected final changes: **0**. Selected fixture hashes unchanged.
- The local smoke's cloud transfer count is **0**. It uses the real transport, API, adapter, extracted production background handlers, and embedded Worker with emulated R2 storage. Adapter upload staging read-backs and Worker internal copy traffic are additional emulated traffic, excluded from the explicit client-byte metric.
- Bridge/Explorer focused tests: **103 passed / 0 failed**, including **8 bridge tests**. Final aggregate results are recorded in `verification/python-cli/checks.json`.
- Python CLI unit tests: **18 passed / 0 failed**. Coverage includes manifest pin and pointer rejection, path escape, explicit owner budgets, no-call dry run, false-success receipts, independent hash mismatch, unsupported operations, interrupted ownership, snapshot diff, timeout classification, and verified cleanup.
- Final full suite: **570 executed, 560 passed, 10 failed**. Independent archive baseline at 531546e: **562 executed, 552 passed, the same 10 failed**. No assertions were weakened, skipped or removed to make failures disappear.
- Schema validation: **480 local-smoke command/receipt records plus 2 blocked-run records validated** against the normative schema using Python jsonschema (verification tool only; runtime stays dependency-free).
- `npm run check` passed. `npm run reliability:check` failed: its architecture stage is stale, and its older seven-failure allowlist labels three independently reproduced baseline failures as new. All ten are preserved in the checks artifact and logs; no gate was weakened.

Evidence directory: `docs/beta/verification/python-cli/`.

`local-real-corpus/` contains the complete required `summary.json`, `results.csv`, `journal.jsonl`, `before.json`, `after.json`, `diff.json`, `summary.md`, plus manifest/plan/state and `local-provider.json`. `live-blocked/` contains the same report set: all **56 requested scenarios BLOCKED**, zero executed scenarios, zero cloud transfers. `live-blocked.plan.json` uses explicit NOT_CONFIGURED placeholders; it is diagnostic evidence, not owner authorization.

The complete suite's ten unchanged failures concern frozen project/debug/semantic evidence, Nested drag-handle expectations, and provisioning-refresh expectations. Their exact names are retained in the baseline/final logs. This branch is not certified green or release-ready.

## Windows PowerShell: install and connect

Use an owner-controlled checkout. Python 3.10+, Node 22+, Git and Git LFS must already be installed. Run in PowerShell from the repository root:

```powershell
git fetch origin beta-explorer
git switch beta-explorer
git pull --ff-only origin beta-explorer
git lfs install --local
git lfs pull
npm ci --no-audit --no-fund
py -3 tools/lab/redown_lab.py inventory --corpus test-fixtures/real-corpus --output work/corpus-inventory.json
```

Reload the updated extension in `chrome://extensions` (Developer mode → Load unpacked → the repository `extension` folder, only where administrator policy permits it). Use REDOWN's existing settings to sign in to Cloudflare and select/setup the intended test bucket explicitly. The lab never deploys/repairs a Worker for you. Copy the installed extension ID from Chrome.

Create one token in this terminal and keep the terminal open. Do not save the token in the repository or evidence:

```powershell
$extensionId = Read-Host 'Installed REDOWN extension ID'
$tokenBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($tokenBytes)
$rng.Dispose()
$env:REDOWN_LAB_TOKEN = [Convert]::ToBase64String($tokenBytes)
$env:REDOWN_LAB_TOKEN | Set-Clipboard
Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$((Get-Location).Path)'; node tools/lab/bridge.mjs --extension-id $extensionId --root '$((Get-Location).Path)'"
```

The child inherits the token environment. Open `chrome-extension://<your-extension-id>/beta/lab.html` in Chrome, paste the token into its password field, and click Connect. Keep that tab open. Clear the clipboard after pasting:

```powershell
Set-Clipboard -Value ''
py -3 tools/lab/redown_lab.py doctor
```

No native-host registry or manifest installation is needed. Bridge defaults to port 8766; use `--port` on both bridge and Python CLI if changing it.

## Select and execute a small batch

Edit account/bucket values deliberately. The following creates an explicit two-file plan with mutation tests limited to one file:

```powershell
$runId = 'owner-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$accountId = Read-Host 'Approved Cloudflare account ID'
$bucket = Read-Host 'Approved test bucket'
$plan = [ordered]@{
  provider = 'cloudflare-r2'
  accountId = $accountId
  bucketName = $bucket
  destination = "redown-test-lab/$runId/"
  corpus = (Resolve-Path test-fixtures/real-corpus).Path
  files = @('1-byte.bin', 'minimal.pdf')
  operations = @('upload', 'download', 'copy', 'rename', 'move', 'delete')
  operation_files = @{
    copy = @('1-byte.bin'); rename = @('1-byte.bin')
    move = @('1-byte.bin'); delete = @('1-byte.bin')
  }
  max_files = 2
  max_bytes = 1048576
}
New-Item -ItemType Directory -Force work | Out-Null
$plan | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 work/owner-plan.json
py -3 tools/lab/redown_lab.py run --plan work/owner-plan.json --out "work/$runId" --dry-run
py -3 tools/lab/redown_lab.py preflight --plan work/owner-plan.json
py -3 tools/lab/redown_lab.py snapshot --plan work/owner-plan.json --output work/owner-before.json
py -3 tools/lab/redown_lab.py run --plan work/owner-plan.json --out "work/$runId"
py -3 tools/lab/redown_lab.py status --run "work/$runId"
py -3 tools/lab/redown_lab.py diff --before "work/$runId/before.json" --after "work/$runId/after.json"
py -3 tools/lab/redown_lab.py report --run "work/$runId"
Get-Content "work/$runId/summary.md"
Import-Csv "work/$runId/results.csv" | Format-Table operation,fixture,verdict,code
```

If preflight fails, stop and resolve the explicit error; do not treat the dry plan as executed verification. A run directory is created once and never silently reused. Read `journal.jsonl`, recovery keys and `status` before deciding whether uncertain writes can be retried.

## Full corpus later: explicit owner-only command

This was **not executed against cloud storage by Codex**. It selects all 240 inventoried files and raises the aggregate byte/count budgets deliberately. It retains operation limits from the small plan, so only the original selected fixture gets copy/rename/move/delete unless the owner changes those lists. Large fixtures require available OPFS storage and retain the existing 300 MB per-file provider limit.

```powershell
$inventory = Get-Content work/corpus-inventory.json -Raw | ConvertFrom-Json
$fullId = 'owner-full-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$full = Get-Content work/owner-plan.json -Raw | ConvertFrom-Json
$full.destination = "redown-test-lab/$fullId/"
$full.files = @($inventory.files | ForEach-Object { $_.path })
$full.max_files = $inventory.file_count
$full.max_bytes = $inventory.bytes
$full | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 work/full-plan.json
py -3 tools/lab/redown_lab.py run --plan work/full-plan.json --out "work/$fullId" --dry-run
py -3 tools/lab/redown_lab.py preflight --plan work/full-plan.json
# The following line explicitly authorizes the selected full batch:
py -3 tools/lab/redown_lab.py run --plan work/full-plan.json --out "work/$fullId"
```

For a selected failed scenario, prepare a NEW plan with a NEW prefix, exactly the failed fixture selection, and the selected failed operations plus upload/download prerequisites. Example retry for failed scenario `0:download`:

```powershell
# Edit work/retry-plan.json first; select the failed fixture and operations upload/download.
py -3 tools/lab/redown_lab.py retry --run "work/$runId" --scenario '0:download' --plan work/retry-plan.json --out work/retry-001 --dry-run
py -3 tools/lab/redown_lab.py retry --run "work/$runId" --scenario '0:download' --plan work/retry-plan.json --out work/retry-001
```

Retry is a fresh isolated reproduction, not same-prefix crash resume. Prior failed reports remain unchanged.

## Cleanup and evidence export

```powershell
py -3 tools/lab/redown_lab.py cleanup --run "work/$runId"
# Review exact keys and content ownership before executing:
py -3 tools/lab/redown_lab.py cleanup --run "work/$runId" --execute
py -3 tools/lab/redown_lab.py report --run "work/$runId"
Compress-Archive -Path "work/$runId/*" -DestinationPath "work/$runId-evidence.zip"
```

Cleanup rehashes before deletion and independently checks absence. It records `cleanup.json`, per-operation cleanup snapshots in the journal, and latest `cleanup.before.json`/`cleanup.after.json`. It does not recursively remove unknown keys or unverified recovery staging. Partial cleanup is retained as evidence. Local `work/bridge-downloads` can be preserved separately if downloaded bytes are needed for review.

## Known defects, limitations and prioritized continuation

1. **Owner live acceptance is BLOCKED here.** Verify actual Chrome loopback access, saved OAuth session/refresh, Worker5+ readiness, OPFS quota and disk-backed uploads, and genuine R2 hashes. Do not infer those results from local emulation.
2. Existing R2 delete has no conditional delete. Cleanup detects changed content before delete but cannot atomically prevent an unrelated writer racing between read-back and deletion. Keep the run prefix exclusive. No blanket prefix deletion is exposed.
3. Interrupted writes are not resumed. State/journal preserve ownership intents and uncertain results; unverified staging data requires owner reconciliation. Closing Chrome can leave OPFS spool files. Add an explicit scoped recovery/OPFS inspection workflow next.
4. Per-operation bridge deadline is 180 seconds; the extension API signal is 170 seconds. Long operations may remain uncertain remotely after a timeout. No mutation is replayed automatically. Downloads and provider read retries retain existing REDOWN behavior; Python adds no retry loop.
5. Provider request IDs are not consistently supplied by existing handlers. Existing receipt data is preserved; add native diagnostic fields at their actual provider ownership boundary rather than manufacturing IDs in Python.
6. Expand owner scenarios to mkdir/empty trees, overwrite/conflicts, archives, remote ingestion and cross-provider workflows only through the shared API. Unsupported CLI operations remain unavailable explicitly. Add run-wide time budgets and durable same-prefix reconciliation before claiming automatic recovery.
7. Observations cover the chosen prefix and selected immutable fixtures. They cannot prove global account immutability or rule out external concurrent writers. Per-file full-content hashes are derived only from selected downloads; snapshots themselves are metadata observations.
8. Resolve the ten reproduced baseline failures separately, without refreshing frozen evidence to hide drift. Installed Explorer/Test It behavior still needs owner/browser acceptance even though the existing focused regression suite passes.

Report example (measured local smoke, not live R2):

```json
{"requested":56,"executed":56,"counts":{"PASS":56,"FAIL":0,"UNSUPPORTED":0,"BLOCKED":0,"TIMEOUT":0,"UNVERIFIED":0},"bytes_transferred":20579,"completed_client_transfers":{"upload":24,"readStream":30}}
```
