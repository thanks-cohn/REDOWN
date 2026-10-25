# One-click architecture laboratory (read-only acceptance remains incomplete)

Use Python 3.10+ with Tkinter and the approved Chrome installation described in
[setup and pairing](README.md). From the latest checkout in PowerShell:

```powershell
git pull --ff-only origin main
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -m redown.install_host --extension-id YOUR_32_CHARACTER_EXTENSION_ID
.\.venv\Scripts\python.exe -m redown.lab gui
```

Update/reload the extension using the normal approved installation flow. Connect
Cloudflare in REDOWN, open its Python Laboratory page, discover accounts/buckets,
select only authorized test buckets and start the local connection. In Python,
click CONNECT TO REDOWN and compare the pairing code. Approve the selected buckets
and duration in the extension. Keep its page open. Refresh connection requests a
new approval; it does not replay operations or recover a lost session.

1. Click CHOOSE LOCAL DIRECTORY, including `test-fixtures/architecture-samples`.
   Review the per-extension preview, selected bytes and exclusions in the output.
   Scan limits can be changed before choosing the directory again.
2. Select one or more granted test buckets with Ctrl/Shift. Four are useful for
   coverage but optional. The connection result exposes capabilities and limits.
3. Click RUN ARCHITECTURE TESTS. Progress names each operation, sample and status.
   CANCEL RUN / SCAN stops between operations or hash chunks; an already dispatched
   request remains subject to the transport deadline. Completed cases remain copyable.
4. COPY JSON REPORT copies exactly the formatted JSON used by SAVE JSON. SAVE
   MARKDOWN exports a human-readable case table. Relative paths and hashes may be
   sensitive; review before sharing. Reports do not include tokens or raw responses.

The lab performs no uploads, deletes, deployments, bucket creation or policy changes.
It lists scoped buckets and attempts metadata/readback only at selected files' exact
relative keys. A known object must already exist at that key to verify source bytes.
Missing samples cannot prove a transfer; they remain failed metadata/blocked readback.
The raw-byte hash check does not certify media decoding. ETags are never SHA-256.
The read-only bridge supports 64 KiB objects and 100 executions per approved session.
A large directory is never silently reduced to fit that budget: remaining operations
are blocked; reconnecting requires approval and starts a new run. Mutation, range,
versioning and durable-recovery scenarios are unsupported. Revoke/expiry/fault/media
scenarios need separate acceptance and receive no automatic passing credit.

## Agents and CI

```powershell
.\.venv\Scripts\python.exe -m redown.lab scan --directory .\test-fixtures\architecture-samples --report inventory.json
.\.venv\Scripts\python.exe -m redown.lab architecture --offline --directory .\test-fixtures\architecture-samples --report offline.json
.\.venv\Scripts\python.exe -m redown.lab architecture --directory C:\Samples --report connected.json
```

Without `--root`, the connected CLI selects all explicitly approved roots. Supply
`--root` with an exact root JSON from discovery to restrict it. GUI always requires
an explicit bucket selection. Pairing occurs once per CLI process. Existing
`conformance` and advanced JSON controls remain available.

CLI limits: `--max-files 100000 --max-file-bytes 1073741824
--max-total-bytes 4294967296`. Scan is streaming SHA-256, not whole-file buffering.
Sparse files count their logical bytes; zero bytes are eligible. Dotfiles without a
suffix use `[none]`; `.jpg`/`.jpeg` stay distinct. Extension case is normalized,
relative paths retain case/Unicode and collisions are reported. Symlinks, Windows
reparse points/junctions and nonregular files are excluded. Files that change during
hashing are excluded. Avoid modifying the selected tree during scanning; this is a
local scanner, not an adversarial filesystem sandbox. Oversize/unreadable exclusions
are explicit. Entry limits and cancellation mark the inventory incomplete.

Selection chooses up to five distinct SHA-256 contents per extension, at evenly
spaced size ranks including both extremes. Depth and lexical relative path break
ties. Duplicate contents within an extension are excluded with reasons. There is
no overall sixty-file cap.

Architecture exit codes: 0 complete (currently never awarded), 1 failed case,
2 incomplete/blocked/unsupported coverage, 3 indeterminate transport, 4 invalid
local input. Scan uses 0 for a finished scan, 2 for interrupted/entry-limited scans.
Each completed case atomically checkpoints the CLI JSON; an absent `finishedAt`
means interruption. No blind replay or cloud resumption is performed. Start a new
approved run after reconnect. JSON schema: [report contract](architecture-report.schema.json).
A provider-declared receipt remains `UNVERIFIED_CONNECTION`; only independent live
acceptance can establish actual R2 execution. Injected provider tests are mocked.
Windows visual/native-host/ACL behavior and live Cloudflare remain untested here.
