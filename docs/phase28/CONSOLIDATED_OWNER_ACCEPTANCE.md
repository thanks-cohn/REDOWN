# Consolidated owner acceptance — no live cure claimed

PR #38 is merged into main. This tested successor is on
`fix/foundation-consolidation`, client **0.5.3**. It preserves connection lifecycle,
conditional-write safety and existing diagnostics. No cloud changes were performed.
The original live write cause remains **UNPROVEN**; owner Doctor output is decisive.

## Windows PowerShell setup

Close the old Python GUI. From your existing REDOWN checkout:

```powershell
git fetch origin
git switch fix/foundation-consolidation
git pull --ff-only
.\.venv\Scripts\python.exe -m pip install --upgrade ./clients/python
.\.venv\Scripts\python.exe -m redown.install_host --extension-id mkadkgpekmkknfbniacdlmgikihjjepf
```

Reload the unpacked Chrome extension from THIS checkout. Reopen its Python Laboratory
page, discover/select the dedicated authorized test bucket and start local connection.
Keep it open. Each new CLI process needs its matching connection code approved.
Registration uses your previously supplied extension ID; if the installed ID differs,
use the exact ID from chrome://extensions instead. No administrator/cloud tokens needed.

One-command **read-only** diagnostic:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --report .\redown-doctor.json
```

Preserve JSON and Markdown even if BLOCKED/FAIL. The shared facade validates the
provider's report, current root scope and authorization before/after probing. R2
settings, binding, legacy HEAD comparison and actual deployed capabilities stay in
R2 support; no generic core assumes a Worker. The old HEAD comparison is optional
information; it does not replace the documented metadata route. Do NOT Repair,
deploy Workers or change bucket policies in response to an error without separately
explicit scoped authorization. Share the redacted Doctor report, not tokens/console dumps.

## Separately approved fresh write

Only after read-only Doctor's REQUIRED checks pass, start a NEW pairing with the
extension's separate write checkbox approved for one dedicated lab bucket. Then:

```powershell
.\.venv\Scripts\python.exe -m redown.lab doctor --operation upload --smoke --report .\redown-doctor-smoke.json
```

The smoke uses exactly eight bytes `[0,1,2,3,127,128,254,255]` in a fresh grant/run
namespace. Conditional creation forbids overwrites. Existing `hello bucket.txt` is
never targeted; no cleanup/delete is performed. The report's `smoke.destinationRoot.key`
and `smoke.runId` identify `<root.key><runId>/uploads/hello.bin`.
Dashboard-download that exact object to a separate local folder and run:

```powershell
Get-FileHash .\downloaded\hello.bin -Algorithm SHA256
```

Compare with `smoke.inventory.selected[0].sha256`. Preserve both Doctor reports and
the independent hash. Dashboard-download the pre-existing `hello bucket.txt` before
and after testing, if possible, and compare its hashes separately. No source success,
capability advertisement, ETag or injected fixture substitutes for actual bytes.

Exit: 0 PASS, 1 FAIL, 2 BLOCKED, 3 INDETERMINATE, 4 UNSUPPORTED. Never replay an
ambiguous write, even with a new key. Reconcile independently; reconnect only through
a NEW approved grant after expiry/revocation. Larger-file work stays deferred until
this small-file live acceptance is recorded.

Actual Windows/Chrome execution, live R2 bytes and unchanged pre-existing cloud
fixture remain NOT_TESTED here. Unix local-filesystem and Python stdio proof is
separate. Review the consolidation [audit](../architecture/REDOWN_FOUNDATION_CONSOLIDATION_AUDIT.md)
and [handoff](../assignments/handoffs/REDOWN_CONSOLIDATION_HANDOFF.md) for exact evidence.
