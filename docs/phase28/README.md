# Phase 2.8 — bounded authenticated write laboratory

This usable subset adds conditional small-file upload, separate OAuth byte readback,
local verified download, metadata, listing, copy and directory markers through the
existing extension → scoped session → canonical coordinator → provider adapter.
Python never receives OAuth or Worker credentials. The tagged
`v0.4.4-python-lab-readonly` baseline is unchanged; read-only approval and commands remain.
No release or deployment was performed. **Live R2 and installed Windows Chrome
acceptance remain NOT_TESTED.** Reports deliberately retain `INCOMPLETE` acceptance.

## Windows setup (PowerShell, from your REDOWN checkout)

Close the old GUI first. After main delivery, use:

```powershell
git switch main
git pull --ff-only
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -m redown.install_host --extension-id YOUR_32_CHARACTER_CHROME_EXTENSION_ID
.\.venv\Scripts\python.exe -m redown.lab gui
```

Reuse an existing `.venv` if present. Python 3.10+ with Tk is required; official
Windows Python installers include Tcl/Tk unless deselected. Get the exact extension
ID from `chrome://extensions` with Developer mode enabled. Registration is per-user,
uses that exact ID, and quotes interpreter paths containing spaces. No admin rights
or cloud tokens are required. Re-register if the interpreter or extension ID changes.

Reload REDOWN at `chrome://extensions` to load updated source. Close/reopen its
Python Laboratory page and restart its local connection. The installed extension
must actually use this checkout's `extension` directory; pulling a repository does
not update a separately installed Store extension. Keep the Laboratory tab open.

## First authenticated write acceptance

1. In Settings, connect Cloudflare normally. Use one existing dedicated bucket named
   `test-1-new`, `test-2-new`, `test-3-new` or `test-4-new` and its saved REDOWN Worker.
   Do not select an unrelated bucket. The laboratory never provisions, repairs,
   changes bucket visibility, or changes public/private policies.
2. **One explicit prerequisite:** the dedicated bucket's existing Worker must contain
   the new `labConditionalCreate` endpoint. Reloading Chrome does not update a
   deployed Worker. Use that dedicated bucket's existing **Repair** control yourself
   after reloading updated REDOWN, if needed. This uploads the existing embedded
   Worker with the added conditional-create route; do not repair unrelated buckets.
   The lab verifies actual OAuth Worker settings and account subdomain before each
   write. Missing permission, wrong binding, missing profile or an older Worker
   produces a visible `LAB_WORKER_*` error, with no fallback to unsafe OAuth PUT.
3. In the extension Laboratory: discover buckets, select only that lab bucket, check
   **Separately approve laboratory writes**, choose the grant duration, and press
   **Start local connection**. Read-only approval remains the unchecked default.
4. In Python: press **CONNECT TO REDOWN**; approve its matching code in the extension.
   Write approval is separate from read approval, and never includes deletion.
5. Create a tiny deterministic local fixture:

```powershell
New-Item -ItemType Directory -Force .\lab-smoke | Out-Null
[IO.File]::WriteAllBytes((Join-Path $PWD 'lab-smoke\hello.bin'), [byte[]](0,1,2,3,127,128,254,255))
Get-FileHash .\lab-smoke\hello.bin -Algorithm SHA256
```

6. Choose `lab-smoke` in Python; select **Comprehensive**, **Balanced**, and exactly
   one approved bucket. Review **PREFLIGHT**, then press **RUN COMPLETE LABORATORY**.
   The run uploads, independently reads through the OAuth Object API, writes an
   exclusive local temporary download and compares SHA-256 with the source. It also
   attempts metadata, copy, listing and a directory marker. JSON/Markdown checkpoints
   are saved automatically under `redown-lab-runs` in your launch directory. The GUI
   supports exact JSON copy and export, including interrupted results.
7. Inspect the report's `destinationRoot.key` and `runId`. The uploaded key is:
   `<destinationRoot.key><runId>/uploads/hello.bin`. Open the selected bucket in the
   Cloudflare R2 dashboard, download that exact object to a different local folder,
   and compare `Get-FileHash <downloaded-file> -Algorithm SHA256` with step 5.
   Preserve that dashboard-downloaded hash and the report as the first live
   acceptance record. An adapter receipt or our injected fixture test is not this
   independent manual acceptance.
8. Objects remain in the unique namespace for inspection. No automatic cleanup or
   deletion is available. Do not delete unrelated objects. Revoke the grant in the
   extension when finished. After expiration/logout/disconnect, obtain a **new**
   pairing and run namespace. Never replay an uncertain write.

## CLI and unavailable-provider reporting

Ordinary GUI use requires no JSON requests. The CLI shares the same runner:

```powershell
.\.venv\Scripts\python.exe -m redown.lab complete --directory .\lab-smoke --depth Comprehensive --profile Balanced --report .\write-report.json
.\.venv\Scripts\python.exe -m redown.lab complete --directory .\lab-smoke --offline --report .\offline-report.json
```

Approve the matching connection in REDOWN for the connected command. The first
approved root is used in CLI mode; the GUI requires exactly one selected bucket.
`--root` may select an exact approved root. Offline/unavailable-extension runs still
produce both reports with BLOCKED cloud cases. Exit 2 means incomplete coverage,
including a successful bounded subset; exit 1 means failed/indeterminate cases.
Use `redown.lab architecture` or `conformance` for preserved read-only workflows.

## Exact scope and limitations

- **Transfer ceiling: 65,536 bytes per object**, including copies. Larger source
  files are inventoried and explicitly UNSUPPORTED in the plan. No multipart,
  large-file transport streaming, split-file emulation or resumability is claimed.
- Comprehensive attempts every eligible file, including duplicate contents; no
  60-file or five-per-extension cap. Quick samples extension/size/depth/Unicode
  groups. Stress additionally repeats reads; interruption injection, pressure,
  concurrent network transfers and recovery tests remain NOT_TESTED.
- Low RAM/Balanced/Maximum set real scan/local-read buffer sizes of 16 KiB/64 KiB/
  1 MiB. Custom exposes the memory target, buffer and requested concurrency; buffer
  sizing is reduced against the target and requested concurrency. **Effective
  network concurrency is always one** in this transport. Memory is a target, not a
  cap: interpreter, inventory, reports, Atlas and journal metadata add overhead.
  These profiles do not implement the full requested parallel resource scheduler.
- Scan limits are explicit and configurable (GUI and CLI): 100,000 entries,
  1 GiB per file, 4 GiB total hashing by default. Increase them for larger corpora.
  Symlinks/junctions, unreadable/changed files, limits and cancellation are visible
  exclusions; unscanned remainder sizes are unknown. SHA-256 uses bounded buffers.
- Inventory reports extensions, conservative signature hints, sizes/hashes,
  duplicates, empty/sparse files, Unicode/unusual names, depth/case collisions and
  streaming/multipart candidates. Format decoding and corruption detection remain
  NOT_TESTED; byte-preserving transfer is independent of format validity.
- Only new objects are created, atomically conditional on absence through the
  existing R2 binding. No overwrite policy is offered. Move, rename and safe delete
  remain UNSUPPORTED: R2 does not supply atomic revision-conditioned deletion here.
  Copy preserves sources. A grant permits up to 100,000 operations; budget failure
  is explicit. The latest payload-bearing jobs are retained in a bounded ring;
  old idempotency tombstones refuse replay with `IDEMPOTENCY_HISTORY_EXPIRED`.
  Reports preserve completed evidence independently of that in-memory ring.
- Preflight provides counts, hashes/format distribution, operations, planned payload
  volume, disk availability, memory target and missing permissions/coverage. Timing
  starts unknown; ETA and verified-byte rate use actual completed work. No cloud
  price or pre-existing throughput is invented. CPU time and Unix peak RSS are observed; Windows RSS
  is unavailable and reported NOT_TESTED. Transfer byte counters cover verified
  downloads, not complete network traffic or billing.
- Official hosted packs, verified remote manifest downloads, full diagnostic
  certification and automatic cloud cleanup are not delivered in this subset.
  Users always supply their own folder; the repository's local fixtures still work.
- Windows launcher registration is checked with mocked Windows facilities. The
  native relay is exercised with real Python processes on Linux. Desktop Tk startup
  is blocked here by the absent display; actual Windows GUI/native Chrome and live
  R2 remain manual acceptance requirements.

Reports contain sensitive local paths, names and provider metadata; store them
privately. They contain no file bytes, OAuth tokens or Worker secrets.
