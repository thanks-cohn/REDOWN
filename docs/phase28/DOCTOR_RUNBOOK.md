# Evidence-first Doctor — Windows operator runbook

The feature branch preserves connection repair `7321381031e901d3e843182bfd283fc9c48bf10c`.
Client is 0.5.2. **Do not merge automatically. No cloud repair/deployment is authorized
by these commands.** Original live root cause remains UNPROVEN pending your report.

Close the old Python GUI. From the existing REDOWN checkout in PowerShell:

```powershell
git fetch origin
git switch fix/evidence-first-write-diagnostics
git pull --ff-only
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -m redown.install_host --extension-id mkadkgpekmkknfbniacdlmgikihjjepf
```

Reload the unpacked REDOWN extension from this checkout at `chrome://extensions`.
Reopen its Python Laboratory page, discover/select your authorized test-1-new
bucket and start the local connection. Keep that page open. Do not press Repair,
change bucket policies, deploy Workers or create unrelated infrastructure.

Run the read-only probe (one command), then approve the matching code in REDOWN:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --report .\redown-doctor.json
```

It produces both redown-doctor.json and .md on failure as well as success. It requires
no Python GUI, credentials or browser console snippets. Read-only approval suffices.
Old HEAD is an informational comparison; the required metadata route now uses GET
prefix listing. The report distinguishes actual control API settings, account host,
binding/jurisdiction and deployed authenticated capability checks. Provider messages,
keys, URLs and tokens are excluded; HTTP status, numeric code, stage and safe request
ID remain. Never infer that a PASS Doctor means an object was written.

For an **explicitly requested** eight-byte write probe, start a NEW pairing with the
extension's separate write checkbox approved for the dedicated laboratory bucket:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --smoke --report .\redown-doctor-smoke.json
```

The same command first runs read-only Doctor. Required preflight failures block
smoke without writing. A successful preflight then uses the canonical laboratory,
a unique grant/run prefix, conditional-create and independent OAuth readback/local
SHA-256. The fixture is precisely bytes `0,1,2,3,127,128,254,255`. The pre-existing
`hello bucket.txt` is never an operation target. No deletion or cleanup is attempted;
retain the new namespace for inspection. A worker lacking the new capability must
remain BLOCKED until you separately authorize a scoped deployment; this tool will
not repair it for you.

Independent owner acceptance:

1. Preserve the original failing reports unchanged. If feasible, dashboard-download
   `hello bucket.txt` before and after the probe and compare Get-FileHash values.
2. In `smoke.destinationRoot.key` and `smoke.runId`, find the uploaded object:
   `<root.key><runId>/uploads/hello.bin`. Download that exact object through the R2
   dashboard to a separate folder. Compare its SHA-256 with
   `smoke.inventory.selected[0].sha256` using `Get-FileHash`.
3. Preserve both Doctor reports, the downloaded hash and whether the pre-existing
   fixture stayed unchanged. Local injected tests are not this live acceptance.

Exit codes: 0 required checks/smoke PASS; 1 FAIL; 2 BLOCKED (including unavailable
helper/approval); 3 INDETERMINATE; 4 UNSUPPORTED old extension. An indeterminate write
is never automatically repeated. Do not use a new idempotency key to replay the same
uncertain object. Inspect persisted state through the independent route first.

The optional local `telemetry` field contains OTLP JSON and measured local stage
latencies/golden-signal counts. It is never uploaded. Full distributed OTel SDK spans,
Worker-side export, saturation instrumentation and full AAC certification remain
partial. See the [standard](../architecture/REDOWN_DIAGNOSTIC_STANDARD.md) and
[incident](../../FOREVER_WORKS/bugs/FW-REDOWN-LIVE-R2-WRITE-PROVIDER-ERROR-20261025.md).
